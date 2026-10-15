import { testarConexao } from '@/api/saude';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
});

it('servidor no ar: ok com o tempo da resposta, sem barra duplicada na URL', async () => {
  fetchMock.mockResolvedValue({ ok: true, status: 200 });
  const resultado = await testarConexao('http://192.168.0.247:8000/');
  expect(fetchMock.mock.calls[0][0]).toBe('http://192.168.0.247:8000/health');
  expect(resultado).toEqual({ ok: true, ms: expect.any(Number) });
});

it('erro do servidor devolve o status', async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 502 });
  expect(await testarConexao('http://api')).toEqual({ ok: false, motivo: 'servidor', status: 502 });
});

it('sem rede', async () => {
  fetchMock.mockRejectedValue(new TypeError('Network request failed'));
  expect(await testarConexao('http://api')).toEqual({ ok: false, motivo: 'rede' });
});

it('tempo esgotado aborta a chamada', async () => {
  jest.useFakeTimers();
  fetchMock.mockImplementation(
    (_url: string, init: { signal: AbortSignal }) =>
      new Promise((_resolver, rejeitar) => {
        init.signal.addEventListener('abort', () => rejeitar(new Error('abortada')));
      }),
  );
  const desfecho = jest.fn();
  void testarConexao('http://api', 5_000).then(desfecho);
  await jest.advanceTimersByTimeAsync(4_999);
  expect(desfecho).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1);
  expect(desfecho).toHaveBeenCalledWith({ ok: false, motivo: 'tempo' });
});
