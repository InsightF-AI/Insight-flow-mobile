import { URL_PADRAO_DA_API, urlDoServidor } from '@/config/ambiente';

const original = process.env.EXPO_PUBLIC_API_URL;

afterEach(() => {
  if (original === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = original;
});

it('devolve a raiz configurada, sem a barra final', () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://192.168.0.247:8000/';
  expect(urlDoServidor()).toBe('http://192.168.0.247:8000');
});

it('sem variável usa o padrão (simulador ou prévia no PC)', () => {
  delete process.env.EXPO_PUBLIC_API_URL;
  expect(urlDoServidor()).toBe(URL_PADRAO_DA_API);
});
