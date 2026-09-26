import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { ApiError } from '@/api/client';
import { portfolioApi } from '@/api/portfolio';
import type { Comparativo, TipoBenchmark } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { renderizar } from '@/test/renderizar';

import Portfolio from '../../app/(tabs)/portfolio';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
// A rosca usa Skia, que não roda no Jest.
jest.mock('@/components/GraficoDistribuicao', () => ({ GraficoDistribuicao: () => null }));
jest.mock('@/api/portfolio', () => ({
  portfolioApi: {
    listarOperacoes: jest.fn(),
    posicoes: jest.fn(),
    rentabilidade: jest.fn(),
    benchmark: jest.fn(),
    distribuicao: jest.fn(),
    removerOperacao: jest.fn(),
  },
}));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  // Defaults: toda consulta da tela precisa devolver algo (o TanStack rejeita `undefined`).
  jest.mocked(portfolioApi.posicoes).mockResolvedValue([]);
  jest.mocked(portfolioApi.rentabilidade).mockResolvedValue({
    custo_base_brl: '0',
    valor_mercado_brl: '0',
    lucro_nao_realizado_brl: '0',
    lucro_realizado_brl: '0',
    percentual: '0',
  });
  jest.mocked(portfolioApi.benchmark).mockRejectedValue(new ApiError(404, 'Nenhuma operacao registrada'));
  jest.mocked(portfolioApi.distribuicao).mockResolvedValue({ por_classe: {}, por_setor: {}, por_moeda: {} });
});

it('sem operações mostra o estado vazio com atalho para registrar', async () => {
  const user = userEvent.setup();
  jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([]);
  await renderizar(<Portfolio />);
  await user.press(await screen.findByRole('button', { name: 'Registrar operação' }));
  expect(router.push).toHaveBeenCalledWith('/operacao/nova');
});

it('mostra rentabilidade e benchmarks na escala de fração e o ticker das operações', async () => {
  jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([
    {
      id: 'o-1',
      ativo_id: 'a-1',
      tipo: 'COMPRA',
      quantidade: '10',
      preco_unitario: '30',
      data: '2026-09-01',
      criado_em: '2026-09-01T12:00:00Z',
    },
  ]);
  jest.mocked(portfolioApi.posicoes).mockResolvedValue([
    {
      ativo_id: 'a-1',
      ticker: 'PETR4',
      quantidade: '10',
      preco_medio: '30',
      cotacao_atual: '33',
      valor_mercado: '330',
      valor_mercado_brl: '330',
      lucro_nao_realizado: '30',
      lucro_realizado: '0',
    },
  ]);
  jest.mocked(portfolioApi.rentabilidade).mockResolvedValue({
    custo_base_brl: '300',
    valor_mercado_brl: '330',
    lucro_nao_realizado_brl: '30',
    lucro_realizado_brl: '0',
    percentual: '0.1',
  });
  jest.mocked(portfolioApi.benchmark).mockImplementation(
    async (benchmark: TipoBenchmark): Promise<Comparativo> => ({
      benchmark,
      rentabilidade_carteira_percentual: '0.1',
      rentabilidade_benchmark_percentual: benchmark === 'CDI' ? null : '0.02',
    }),
  );
  jest.mocked(portfolioApi.distribuicao).mockResolvedValue({
    por_classe: { ACAO: '1' },
    por_setor: { Petróleo: '1' },
    por_moeda: { BRL: '1' },
  });

  await renderizar(<Portfolio />);

  expect(await screen.findByText('▲ +10,00%')).toBeOnTheScreen();
  expect(await screen.findByText('+2,00%')).toBeOnTheScreen();
  expect(screen.getByText('indisponível')).toBeOnTheScreen();
  expect(await screen.findByText('Compra · PETR4')).toBeOnTheScreen();
});

it('remoção bloqueada pelo backend (422 só com UUID) mostra frase legível, nunca o UUID', async () => {
  const user = userEvent.setup();
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([
    {
      id: 'o-1',
      ativo_id: 'a-1',
      tipo: 'COMPRA',
      quantidade: '10',
      preco_unitario: '30',
      data: '2026-09-01',
      criado_em: '2026-09-01T12:00:00Z',
    },
  ]);
  jest
    .mocked(portfolioApi.removerOperacao)
    .mockRejectedValue(new ApiError(422, '3fa85f64-5717-4562-b3fc-2c963f66afa6'));
  await renderizar(<Portfolio />);
  await user.press(await screen.findByRole('button', { name: /^Remover operação de compra/ }));
  const remover = alerta.mock.calls[0]?.[2]?.find((botao) => botao.text === 'Remover');
  remover?.onPress?.();
  await waitFor(() => expect(alerta).toHaveBeenCalledTimes(2));
  expect(alerta).toHaveBeenLastCalledWith(
    'Não foi possível remover',
    'Esta operação não pode ser removida: uma venda posterior ficaria sem saldo em carteira.',
  );
  alerta.mockRestore();
});
