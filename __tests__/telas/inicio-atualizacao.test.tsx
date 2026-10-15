import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ativosApi } from '@/api/ativos';
import { notificacoesApi } from '@/api/notificacoes';
import { portfolioApi } from '@/api/portfolio';
import type { ItemWatchlist } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { renderizar } from '@/test/renderizar';

import Inicio from '../../app/(tabs)/index';

// O mock do RefreshControl do React Native não expõe `refreshing`; capturamos as props que a tela entrega à `Tela`.
const mockTela: { atualizando: boolean; aoAtualizar?: () => void } = { atualizando: false };

jest.mock('@/components/Tela', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Tela: (props: { atualizando?: boolean; aoAtualizar?: () => void; children: ReactNode }) => {
      mockTela.atualizando = props.atualizando ?? false;
      mockTela.aoAtualizar = props.aoAtualizar;
      return <View>{props.children}</View>;
    },
  };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn(), definirNotificacao: jest.fn() } }));
jest.mock('@/api/ativos', () => ({ ativosApi: { cotacao: jest.fn(), sinais: jest.fn(), backtest: jest.fn() } }));
jest.mock('@/api/portfolio', () => ({ portfolioApi: { rentabilidade: jest.fn(), posicoes: jest.fn() } }));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));

function item(notificar: boolean): ItemWatchlist {
  return {
    ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar,
    adicionado_em: '2026-10-01T12:00:00Z',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTela.atualizando = false;
  mockTela.aoAtualizar = undefined;
  jest.mocked(watchlistApi.listar).mockResolvedValue([item(true)]);
  jest.mocked(watchlistApi.definirNotificacao).mockResolvedValue(item(false));
  jest.mocked(ativosApi.cotacao).mockResolvedValue({
    ticker: 'PETR4',
    preco: '38.5',
    variacao: '0',
    variacao_percentual: '0',
    maxima_dia: '38.5',
    minima_dia: '38.5',
    volume: '1',
  });
  jest.mocked(ativosApi.sinais).mockResolvedValue([]);
  jest.mocked(portfolioApi.rentabilidade).mockResolvedValue({
    custo_base_brl: '0',
    valor_mercado_brl: '0',
    lucro_nao_realizado_brl: '0',
    lucro_realizado_brl: '0',
    percentual: '0',
  });
  jest.mocked(portfolioApi.posicoes).mockResolvedValue([]);
  jest.mocked(notificacoesApi.listar).mockResolvedValue([]);
});

it('o spinner de "puxar para atualizar" não liga sozinho quando a watchlist é relida depois do sino', async () => {
  const user = userEvent.setup();
  await renderizar(<Inicio />);
  const sino = await screen.findByRole('switch', { name: 'Notificações de PETR4' });
  // A releitura da watchlist que vem depois do PATCH fica pendurada.
  jest.mocked(watchlistApi.listar).mockImplementation(() => new Promise<never>(() => {}));
  await user.press(sino);
  await waitFor(() => expect(watchlistApi.listar).toHaveBeenCalledTimes(2));
  expect(mockTela.atualizando).toBe(false);
});

it('puxar para atualizar liga o spinner até todas as consultas terminarem', async () => {
  await renderizar(<Inicio />);
  await screen.findByRole('switch', { name: 'Notificações de PETR4' });
  let liberar: () => void = () => {};
  jest.mocked(watchlistApi.listar).mockImplementation(
    () =>
      new Promise<ItemWatchlist[]>((resolver) => {
        liberar = () => resolver([item(true)]);
      }),
  );
  await act(async () => {
    mockTela.aoAtualizar?.();
  });
  expect(mockTela.atualizando).toBe(true);
  await act(async () => {
    liberar();
  });
  await waitFor(() => expect(mockTela.atualizando).toBe(false));
});
