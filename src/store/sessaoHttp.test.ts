import * as SecureStore from 'expo-secure-store';

import { configurarApi, request } from '@/api/client';
import { geracaoDaSessao, pertoDeVencer, useSessao } from '@/store/sessao';

// Integração real: client HTTP + store de sessão + authApi, só o fetch é falso.
const armazenamento = (SecureStore as unknown as { __armazenamento: Map<string, string> }).__armazenamento;
const fetchMock = jest.fn();

function resposta(status: number, corpo?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => (corpo === undefined ? Promise.reject(new SyntaxError('sem corpo')) : Promise.resolve(corpo)),
    headers: { get: () => null },
  };
}

const PAR_NOVO = { access_token: 'acc-2', refresh_token: 'ref-2', token_type: 'bearer', expires_in: 1800 };
const PAR_B = { access_token: 'acc-B', refresh_token: 'ref-B', token_type: 'bearer', expires_in: 1800 };

const proximoCiclo = () => new Promise<void>((resolver) => setImmediate(resolver));

function comSessao(expiraEm: number): void {
  useSessao.setState({ status: 'autenticado', token: 'acc-1', refreshToken: 'ref-1', expiraEm, email: 'ana@exemplo.com' });
}

function urlsChamadas(): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

beforeEach(() => {
  fetchMock.mockReset();
  armazenamento.clear();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  configurarApi({
    baseUrl: 'http://api',
    obterToken: () => useSessao.getState().token,
    tokenPertoDeVencer: () => pertoDeVencer(useSessao.getState().expiraEm),
    renovarToken: () => useSessao.getState().renovar(),
    geracaoDaSessao,
  });
});

it('dois 401 simultâneos fazem uma única renovação e as duas requisições repetem com o token novo', async () => {
  comSessao(Date.now() + 1_800_000);
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    if (url.endsWith('/auth/refresh')) return resposta(200, PAR_NOVO);
    const autorizacao = (init.headers as Record<string, string>).Authorization;
    return autorizacao === 'Bearer acc-2' ? resposta(200, { url }) : resposta(401, { detail: 'Token invalido' });
  });
  const [watchlist, alertas] = await Promise.all([request('/watchlist'), request('/alertas')]);
  expect(watchlist).toEqual({ url: 'http://api/api/v1/watchlist' });
  expect(alertas).toEqual({ url: 'http://api/api/v1/alertas' });
  expect(urlsChamadas().filter((url) => url.endsWith('/auth/refresh'))).toHaveLength(1);
  expect(useSessao.getState()).toMatchObject({ token: 'acc-2', refreshToken: 'ref-2' });
});

it('access vencido (app reaberto) renova antes da primeira requisição, sem passar por 401', async () => {
  comSessao(Date.now() - 1_000);
  fetchMock.mockImplementation(async (url: string) =>
    url.endsWith('/auth/refresh') ? resposta(200, PAR_NOVO) : resposta(200, []),
  );
  await expect(request('/watchlist')).resolves.toEqual([]);
  expect(urlsChamadas()).toEqual(['http://api/api/v1/auth/refresh', 'http://api/api/v1/watchlist']);
});

it('refresh recusado encerra a sessão e não repete a requisição', async () => {
  comSessao(Date.now() + 1_800_000);
  fetchMock.mockImplementation(async (url: string) =>
    url.endsWith('/auth/refresh')
      ? resposta(401, { detail: 'Refresh token invalido' })
      : resposta(401, { detail: 'Token invalido' }),
  );
  await expect(request('/watchlist')).rejects.toMatchObject({ status: 401 });
  expect(useSessao.getState().status).toBe('anonimo');
  expect(urlsChamadas()).toEqual(['http://api/api/v1/watchlist', 'http://api/api/v1/auth/refresh']);
});

it('sem rede ao abrir o app mantém a sessão e mostra o endereço do servidor', async () => {
  comSessao(Date.now() - 1_000);
  fetchMock.mockRejectedValue(new TypeError('Network request failed'));
  await expect(request('/watchlist')).rejects.toMatchObject({
    status: 0,
    causa: 'rede',
    message: 'Sem conexão com o servidor (http://api)',
  });
  expect(useSessao.getState().status).toBe('autenticado');
});

it('refresh de A recusado depois que B entrou não derruba a sessão de B', async () => {
  comSessao(Date.now() - 1_000); // access vencido: a requisição renova antes de enviar
  let recusarRefresh: () => void = () => {};
  fetchMock.mockImplementation((url: string) => {
    if (url.endsWith('/auth/refresh')) {
      return new Promise((resolver) => {
        recusarRefresh = () => resolver(resposta(401, { detail: 'Refresh token invalido' }));
      });
    }
    return Promise.resolve(url.endsWith('/auth/logout') ? resposta(204) : resposta(200, []));
  });
  const requisicaoDeA = request('/watchlist').catch((erro: unknown) => erro);
  await proximoCiclo();
  await useSessao.getState().sair();
  await useSessao.getState().entrar(PAR_B, 'bia@exemplo.com');
  recusarRefresh();
  await requisicaoDeA;
  expect(useSessao.getState()).toMatchObject({
    status: 'autenticado',
    token: 'acc-B',
    refreshToken: 'ref-B',
    email: 'bia@exemplo.com',
  });
  expect(JSON.parse(armazenamento.get('insightflow.sessao') ?? '{}')).toMatchObject({ refreshToken: 'ref-B' });
});

it('401 tardio de A depois que B entrou não repete a mutação com o token de B', async () => {
  comSessao(Date.now() + 1_800_000);
  let responder401: () => void = () => {};
  fetchMock.mockImplementation((url: string) => {
    if (url.endsWith('/operacoes')) {
      return new Promise((resolver) => {
        responder401 = () => resolver(resposta(401, { detail: 'Token invalido' }));
      });
    }
    return Promise.resolve(url.endsWith('/auth/logout') ? resposta(204) : resposta(200, PAR_NOVO));
  });
  const mutacaoDeA = request('/operacoes', { metodo: 'POST', corpo: { ativo_id: 'a-1' } }).catch((erro: unknown) => erro);
  await proximoCiclo();
  await useSessao.getState().sair();
  await useSessao.getState().entrar(PAR_B, 'bia@exemplo.com');
  responder401();
  await expect(mutacaoDeA).resolves.toMatchObject({ status: 401 });
  expect(urlsChamadas().filter((url) => url.endsWith('/operacoes'))).toHaveLength(1);
  expect(urlsChamadas().some((url) => url.endsWith('/auth/refresh'))).toBe(false);
  expect(useSessao.getState()).toMatchObject({ status: 'autenticado', token: 'acc-B' });
});

it('servidor que não responde, com sessão vencida: um único tempo limite, sem enviar a requisição e com o endereço', async () => {
  jest.useFakeTimers();
  try {
    comSessao(Date.now() - 1_000);
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolver, rejeitar) => {
          init.signal?.addEventListener('abort', () => rejeitar(new Error('abortado')));
        }),
    );
    const rejeitou = expect(request('/watchlist')).rejects.toMatchObject({
      status: 0,
      causa: 'tempo',
      message: 'O servidor demorou demais para responder (http://api)',
    });
    await jest.advanceTimersByTimeAsync(20_000);
    await rejeitou;
    expect(urlsChamadas()).toEqual(['http://api/api/v1/auth/refresh']);
    expect(useSessao.getState().status).toBe('autenticado');
  } finally {
    jest.useRealTimers();
  }
});
