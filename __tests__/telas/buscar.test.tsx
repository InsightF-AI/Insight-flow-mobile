import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ativosApi } from '@/api/ativos';
import { ApiError } from '@/api/client';
import { watchlistApi } from '@/api/watchlist';
import { renderizar } from '@/test/renderizar';

import Buscar from '../../app/buscar';

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock('@/api/ativos', () => ({ ativosApi: { buscar: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn(), adicionar: jest.fn() } }));

const petr = { ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO' as const, moeda: 'BRL', setor: 'Petróleo' };
// O termo só é buscado 400 ms depois da última tecla (debounce); sob carga o findBy padrão (1 s) estoura.
const TEMPO_DA_BUSCA_MS = 5000;

beforeEach(() => {
  jest.clearAllMocks();
});

it('pede ao menos 2 caracteres antes de buscar', async () => {
  await renderizar(<Buscar />);
  expect(screen.getByText('Digite ao menos 2 caracteres do ticker ou do nome.')).toBeOnTheScreen();
  expect(ativosApi.buscar).not.toHaveBeenCalled();
});

it('escolher um resultado adiciona à watchlist e abre o ativo', async () => {
  const user = userEvent.setup();
  jest.mocked(ativosApi.buscar).mockResolvedValue([petr]);
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  jest.mocked(watchlistApi.adicionar).mockResolvedValue({
    ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: 'Petróleo', moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-09-25T12:00:00Z',
  });
  await renderizar(<Buscar />);
  await user.type(screen.getByLabelText('Ticker ou nome'), 'PETR');
  await user.press(await screen.findByRole('button', { name: 'PETR4, Petrobras PN' }, { timeout: TEMPO_DA_BUSCA_MS }));
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1', ticker: 'PETR4' } }),
  );
  expect(ativosApi.buscar).toHaveBeenLastCalledWith('PETR');
  expect(watchlistApi.adicionar).toHaveBeenCalledWith('PETR4');
});

it('fonte de dados fora do ar mostra erro amigável', async () => {
  const user = userEvent.setup();
  jest.mocked(ativosApi.buscar).mockRejectedValue(new ApiError(503, 'Fonte de dados de mercado indisponivel'));
  await renderizar(<Buscar />);
  await user.type(screen.getByLabelText('Ticker ou nome'), 'VALE');
  expect(await screen.findByRole('alert', undefined, { timeout: TEMPO_DA_BUSCA_MS })).toHaveTextContent(
    'Fonte de dados de mercado indisponível. Tente novamente em instantes.',
  );
});

const itemDaWatchlist = {
  ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO' as const, setor: 'Petróleo', moeda: 'BRL' },
  notificar: true,
  adicionado_em: '2026-09-25T12:00:00Z',
};

it('toque duplo no mesmo resultado adiciona e navega uma única vez', async () => {
  const user = userEvent.setup();
  let concluirAdicao: (item: typeof itemDaWatchlist) => void = () => {};
  jest.mocked(ativosApi.buscar).mockResolvedValue([petr]);
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  jest.mocked(watchlistApi.adicionar).mockImplementation(
    () => new Promise((resolver) => (concluirAdicao = resolver)),
  );
  await renderizar(<Buscar />);
  await user.type(screen.getByLabelText('Ticker ou nome'), 'PETR');
  const resultado = await screen.findByRole('button', { name: 'PETR4, Petrobras PN' }, { timeout: TEMPO_DA_BUSCA_MS });
  await user.press(resultado);
  await waitFor(() => expect(watchlistApi.adicionar).toHaveBeenCalledTimes(1));
  await screen.findByText('Adicionando à watchlist…');
  await user.press(screen.getByRole('button', { name: 'PETR4, Petrobras PN' }));
  expect(watchlistApi.adicionar).toHaveBeenCalledTimes(1);
  concluirAdicao(itemDaWatchlist);
  await waitFor(() => expect(router.replace).toHaveBeenCalledTimes(1));
  expect(watchlistApi.adicionar).toHaveBeenCalledTimes(1);
});

it('o erro da tentativa anterior some ao digitar um novo termo', async () => {
  const user = userEvent.setup();
  jest.mocked(ativosApi.buscar).mockResolvedValue([petr]);
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  jest.mocked(watchlistApi.adicionar).mockRejectedValue(new ApiError(503, 'Fonte de dados de mercado indisponivel'));
  await renderizar(<Buscar />);
  await user.type(screen.getByLabelText('Ticker ou nome'), 'PETR');
  await user.press(await screen.findByRole('button', { name: 'PETR4, Petrobras PN' }, { timeout: TEMPO_DA_BUSCA_MS }));
  expect(await screen.findByRole('alert')).toBeOnTheScreen();
  await user.type(screen.getByLabelText('Ticker ou nome'), '4');
  expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
});
