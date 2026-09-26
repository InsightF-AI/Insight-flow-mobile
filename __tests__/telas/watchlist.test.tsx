import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ativosApi } from '@/api/ativos';
import { ApiError } from '@/api/client';
import type { CotacaoAtual, ItemWatchlist } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { assentarLista, renderizar } from '@/test/renderizar';

import Watchlist from '../../app/(tabs)/index';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn() } }));
jest.mock('@/api/ativos', () => ({ ativosApi: { cotacao: jest.fn() } }));

const NBSP = ' ';

function item(id: string, ticker: string, nome: string): ItemWatchlist {
  return {
    ativo: { id, ticker, nome, tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-09-25T12:00:00Z',
  };
}

const cotacaoPetr: CotacaoAtual = {
  ticker: 'PETR4',
  preco: '38.5',
  variacao: '0.4',
  variacao_percentual: '1.05',
  maxima_dia: '39',
  minima_dia: '38',
  volume: '1000',
};

beforeEach(() => {
  jest.clearAllMocks();
});

it('watchlist vazia oferece a busca', async () => {
  const user = userEvent.setup();
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  await renderizar(<Watchlist />);
  await user.press(await screen.findByRole('button', { name: 'Buscar ativo' }));
  expect(router.push).toHaveBeenCalledWith('/buscar');
  await assentarLista();
});

it('mostra preço e variação, e "sem cotação" quando a cotação falha', async () => {
  jest.mocked(watchlistApi.listar).mockResolvedValue([item('a-1', 'PETR4', 'Petrobras PN'), item('a-2', 'XPTO3', 'Xpto ON')]);
  jest.mocked(ativosApi.cotacao).mockImplementation(async (ativoId: string) => {
    if (ativoId === 'a-2') throw new ApiError(404, 'Cotacao nao encontrada para o ativo');
    return cotacaoPetr;
  });
  await renderizar(<Watchlist />);
  expect(await screen.findByText(`R$${NBSP}38,50`)).toBeOnTheScreen();
  expect(screen.getByText('▲ +1,05%')).toBeOnTheScreen();
  expect(await screen.findByText('sem cotação')).toBeOnTheScreen();
  await assentarLista();
});

it('tocar no ativo abre o detalhe com id e ticker', async () => {
  const user = userEvent.setup();
  jest.mocked(watchlistApi.listar).mockResolvedValue([item('a-1', 'PETR4', 'Petrobras PN')]);
  jest.mocked(ativosApi.cotacao).mockResolvedValue(cotacaoPetr);
  await renderizar(<Watchlist />);
  await user.press(await screen.findByRole('button', { name: 'PETR4, Petrobras PN' }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1', ticker: 'PETR4' } });
  await assentarLista();
});
