import { configurarApi } from '@/api/client';
import { dispositivosApi } from '@/api/dispositivos';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ token: 'x', ativo: true }) });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  configurarApi({
    baseUrl: 'http://api',
    obterToken: () => 'tok',
    tokenPertoDeVencer: () => false,
    renovarToken: jest.fn(async () => null),
    geracaoDaSessao: () => 0,
  });
});

it('registrar envia POST /dispositivos com o token', async () => {
  const resposta = await dispositivosApi.registrar('ExponentPushToken[abc]');
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('http://api/api/v1/dispositivos');
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body)).toEqual({ token: 'ExponentPushToken[abc]' });
  expect(resposta).toEqual({ token: 'x', ativo: true });
});

it('remover envia DELETE com o token codificado na query (os colchetes não vão crus)', async () => {
  fetchMock.mockResolvedValue({ ok: true, status: 204 });
  await dispositivosApi.remover('ExponentPushToken[abc]');
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('http://api/api/v1/dispositivos?token=ExponentPushToken%5Babc%5D');
  expect(init.method).toBe('DELETE');
});
