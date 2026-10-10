import { ConfiguracaoInvalidaError, lerUrlDaApi, URL_PADRAO_DA_API } from '@/config/ambiente';

describe('lerUrlDaApi', () => {
  it('sem valor usa o padrão', () => {
    expect(lerUrlDaApi(undefined)).toBe(URL_PADRAO_DA_API);
    expect(lerUrlDaApi('   ')).toBe(URL_PADRAO_DA_API);
  });

  it.each([
    ['http://192.168.0.10:8000', 'http://192.168.0.10:8000'],
    ['http://192.168.0.10:8000/', 'http://192.168.0.10:8000'],
    ['  https://api.exemplo.com  ', 'https://api.exemplo.com'],
    ['HTTP://10.0.2.2:8000', 'http://10.0.2.2:8000'],
  ])('aceita %s', (entrada, esperado) => {
    expect(lerUrlDaApi(entrada)).toBe(esperado);
  });

  it.each([
    'http://192.168.0.10:8000/api/v1',
    '192.168.0.10:8000',
    'ftp://servidor',
    'http://usuario:senha@servidor:8000',
    'http://servidor:8000?x=1',
    'http://',
  ])('recusa %s com uma mensagem que mostra o formato certo', (entrada) => {
    expect(() => lerUrlDaApi(entrada)).toThrow(ConfiguracaoInvalidaError);
    expect(() => lerUrlDaApi(entrada)).toThrow('http://192.168.0.10:8000');
  });
});
