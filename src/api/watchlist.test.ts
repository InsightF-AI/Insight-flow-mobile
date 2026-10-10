import { configurarApi } from '@/api/client';
import { watchlistApi } from '@/api/watchlist';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  configurarApi({
    baseUrl: 'http://api',
    obterToken: () => 'tok',
    tokenPertoDeVencer: () => false,
    renovarToken: jest.fn(async () => null),
    geracaoDaSessao: () => 0,
  });
});

it('adicionar espera até 30 s: a primeira coleta de histórico de um ticker é lenta', async () => {
  jest.useFakeTimers();
  try {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolver, rejeitar) => {
          init.signal?.addEventListener('abort', () => rejeitar(new Error('abortado')));
        }),
    );
    let terminou = false;
    const promessa = watchlistApi.adicionar('PETR4').finally(() => {
      terminou = true;
    });
    const rejeitou = expect(promessa).rejects.toMatchObject({ causa: 'tempo' });
    await jest.advanceTimersByTimeAsync(25_000);
    expect(terminou).toBe(false);
    await jest.advanceTimersByTimeAsync(5_000);
    await rejeitou;
    expect(terminou).toBe(true);
  } finally {
    jest.useRealTimers();
  }
});
