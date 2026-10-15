import { configurarApi } from '@/api/client';
import { iaApi } from '@/api/ia';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  configurarApi({
    baseUrl: 'http://api',
    obterToken: () => 'tok',
    tokenPertoDeVencer: () => false,
    renovarToken: jest.fn(async () => null),
    geracaoDaSessao: () => 0,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

// Uma chamada que só termina quando o app a aborta (o tempo limite do client).
function chamadaPendurada() {
  fetchMock.mockImplementation(
    (_url: string, init: { signal: AbortSignal }) =>
      new Promise((_resolver, rejeitar) => {
        init.signal.addEventListener('abort', () => rejeitar(new Error('abortada')));
      }),
  );
}

describe('iaApi', () => {
  it('analisar pede GET /ativos/{id}/analise', async () => {
    await iaApi.analisar('a-1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api/api/v1/ativos/a-1/analise');
    expect(init.method).toBe('GET');
  });

  it('conversar envia POST /chat com as mensagens', async () => {
    const mensagens = [{ papel: 'usuario' as const, texto: 'Qual foi o resultado?' }];
    await iaApi.conversar(mensagens);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api/api/v1/chat');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ mensagens });
  });

  it('a análise espera 70 s antes de desistir', async () => {
    jest.useFakeTimers();
    chamadaPendurada();
    const desfecho = jest.fn();
    void iaApi.analisar('a-1').catch(desfecho);
    await jest.advanceTimersByTimeAsync(69_999);
    expect(desfecho).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(desfecho).toHaveBeenCalledWith(expect.objectContaining({ status: 0, causa: 'tempo' }));
  });

  it('o chat espera 90 s antes de desistir', async () => {
    jest.useFakeTimers();
    chamadaPendurada();
    const desfecho = jest.fn();
    void iaApi.conversar([{ papel: 'usuario', texto: 'Oi' }]).catch(desfecho);
    await jest.advanceTimersByTimeAsync(89_999);
    expect(desfecho).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(desfecho).toHaveBeenCalledWith(expect.objectContaining({ status: 0, causa: 'tempo' }));
  });
});
