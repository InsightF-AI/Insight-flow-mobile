import { ApiError, configurarApi, request } from '@/api/client';

type RespostaFalsa = { ok: boolean; status: number; json: () => Promise<unknown> };

function resposta(status: number, corpo?: unknown): RespostaFalsa {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: corpo === undefined ? () => Promise.reject(new SyntaxError('sem corpo')) : () => Promise.resolve(corpo),
  };
}

const fetchMock = jest.fn();
const aoNaoAutorizado = jest.fn();
let token: string | null = null;

beforeEach(() => {
  fetchMock.mockReset();
  aoNaoAutorizado.mockReset();
  token = null;
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  configurarApi({ baseUrl: 'http://api.teste/', obterToken: () => token, aoNaoAutorizado });
});

it('monta a URL com /api/v1 e query string codificada, ignorando undefined', async () => {
  fetchMock.mockResolvedValue(resposta(200, []));
  await request('/ativos/buscar', { query: { termo: 'petr 4', vazio: undefined } });
  expect(fetchMock).toHaveBeenCalledWith(
    'http://api.teste/api/v1/ativos/buscar?termo=petr%204',
    expect.objectContaining({ method: 'GET' }),
  );
});

it('envia Authorization quando há token', async () => {
  token = 'abc';
  fetchMock.mockResolvedValue(resposta(200, {}));
  await request('/watchlist');
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
});

it('não envia Authorization sem token', async () => {
  fetchMock.mockResolvedValue(resposta(200, {}));
  await request('/auth/login', { metodo: 'POST', corpo: {} });
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
});

it('serializa o corpo como JSON', async () => {
  fetchMock.mockResolvedValue(resposta(201, { ok: true }));
  await request('/watchlist', { metodo: 'POST', corpo: { ticker: 'PETR4' } });
  const init = fetchMock.mock.calls[0][1];
  expect(init.method).toBe('POST');
  expect(init.body).toBe('{"ticker":"PETR4"}');
  expect(init.headers['Content-Type']).toBe('application/json');
});

it('devolve o JSON em 2xx', async () => {
  fetchMock.mockResolvedValue(resposta(200, [{ id: 1 }]));
  await expect(request('/watchlist')).resolves.toEqual([{ id: 1 }]);
});

it('204 devolve undefined', async () => {
  fetchMock.mockResolvedValue(resposta(204));
  await expect(request('/watchlist/x', { metodo: 'DELETE' })).resolves.toBeUndefined();
});

it('detail string vira a mensagem do erro', async () => {
  fetchMock.mockResolvedValue(resposta(409, { detail: 'Ativo ja esta na watchlist' }));
  await expect(request('/watchlist')).rejects.toMatchObject({
    status: 409,
    message: 'Ativo ja esta na watchlist',
  });
});

it('detail lista (422 do Pydantic) une as mensagens', async () => {
  fetchMock.mockResolvedValue(
    resposta(422, {
      detail: [
        { loc: ['body', 'quantidade'], msg: 'Input should be greater than 0', type: 'greater_than' },
        { loc: ['body', 'data'], msg: 'Field required', type: 'missing' },
      ],
    }),
  );
  await expect(request('/operacoes')).rejects.toMatchObject({
    status: 422,
    message: 'Input should be greater than 0; Field required',
  });
});

it('corpo sem detail usa mensagem padrão', async () => {
  fetchMock.mockResolvedValue(resposta(500, {}));
  await expect(request('/x')).rejects.toMatchObject({ status: 500, message: 'Erro 500' });
});

it('corpo que não é JSON usa mensagem padrão', async () => {
  fetchMock.mockResolvedValue(resposta(502));
  await expect(request('/x')).rejects.toMatchObject({ status: 502, message: 'Erro 502' });
});

it('falha de rede vira status 0', async () => {
  fetchMock.mockRejectedValue(new TypeError('Network request failed'));
  const erro = await request('/x').catch((e: unknown) => e);
  expect(erro).toBeInstanceOf(ApiError);
  expect(erro).toMatchObject({ status: 0, message: 'Sem conexão com o servidor' });
});

it('timeout aborta a requisição e vira status 0', async () => {
  jest.useFakeTimers();
  try {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolver, rejeitar) => {
          init.signal?.addEventListener('abort', () => rejeitar(new Error('abortado')));
        }),
    );
    const promessa = request('/lento');
    jest.advanceTimersByTime(15_000);
    await expect(promessa).rejects.toMatchObject({ status: 0 });
  } finally {
    jest.useRealTimers();
  }
});

it('401 em requisição autenticada chama aoNaoAutorizado', async () => {
  token = 'vencido';
  fetchMock.mockResolvedValue(resposta(401, { detail: 'Token invalido' }));
  await expect(request('/watchlist')).rejects.toMatchObject({ status: 401 });
  expect(aoNaoAutorizado).toHaveBeenCalledTimes(1);
});

it('401 sem token (login) não chama aoNaoAutorizado', async () => {
  fetchMock.mockResolvedValue(resposta(401, { detail: 'Credenciais inválidas' }));
  await expect(request('/auth/login', { metodo: 'POST', corpo: {} })).rejects.toMatchObject({ status: 401 });
  expect(aoNaoAutorizado).not.toHaveBeenCalled();
});

it('401 tardio de uma sessão anterior não derruba a sessão nova', async () => {
  token = 'velho';
  fetchMock.mockImplementation(async () => {
    token = 'novo';
    return resposta(401, { detail: 'Token invalido' });
  });
  await expect(request('/watchlist')).rejects.toMatchObject({ status: 401 });
  expect(aoNaoAutorizado).not.toHaveBeenCalled();
});

it('2xx com corpo que não é JSON vira ApiError de status 0', async () => {
  fetchMock.mockResolvedValue(resposta(200));
  const erro = await request('/x').catch((e: unknown) => e);
  expect(erro).toBeInstanceOf(ApiError);
  expect(erro).toMatchObject({ status: 0, message: 'Resposta inválida do servidor' });
});
