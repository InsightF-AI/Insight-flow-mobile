import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { ativosApi } from '@/api/ativos';
import { ApiError } from '@/api/client';
import { portfolioApi } from '@/api/portfolio';
import type { Comparativo, ItemWatchlist, Operacao, Posicao, TipoBenchmark } from '@/api/tipos';
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
jest.mock('@/api/ativos', () => ({ ativosApi: { cotacao: jest.fn() } }));

const NBSP = ' ';

function compra(id: string, ativoId = 'a-1', parcial: Partial<Operacao> = {}): Operacao {
  return {
    id,
    ativo_id: ativoId,
    tipo: 'COMPRA',
    quantidade: '10',
    preco_unitario: '30',
    data: '2026-09-01',
    criado_em: '2026-09-01T12:00:00Z',
    ...parcial,
  };
}

function posicao(ativoId: string, ticker: string): Posicao {
  return {
    ativo_id: ativoId,
    ticker,
    quantidade: '10',
    preco_medio: '30',
    cotacao_atual: '33',
    valor_mercado: '330',
    valor_mercado_brl: '330',
    lucro_nao_realizado: '30',
    lucro_realizado: '0',
  };
}

function item(id: string, ticker: string, tipo: ItemWatchlist['ativo']['tipo'] = 'ACAO'): ItemWatchlist {
  return {
    ativo: { id, ticker, nome: ticker, tipo, setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-09-25T12:00:00Z',
  };
}

const rentabilidade = {
  custo_base_brl: '300',
  valor_mercado_brl: '330',
  lucro_nao_realizado_brl: '30',
  lucro_realizado_brl: '12.5',
  percentual: '0.1',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
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
  jest.mocked(ativosApi.cotacao).mockResolvedValue({
    ticker: 'PETR4',
    preco: '33',
    variacao: '0.34',
    variacao_percentual: '1.05',
    maxima_dia: '33.5',
    minima_dia: '32',
    volume: '1000',
  });
});

function prepararCarteiraCompleta() {
  jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([compra('o-1')]);
  jest.mocked(portfolioApi.posicoes).mockResolvedValue([posicao('a-1', 'PETR4')]);
  jest.mocked(portfolioApi.rentabilidade).mockResolvedValue(rentabilidade);
  jest.mocked(watchlistApi.listar).mockResolvedValue([item('a-1', 'PETR4')]);
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
}

it('sem operações mostra o estado vazio com atalho para registrar', async () => {
  const user = userEvent.setup();
  jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([]);
  await renderizar(<Portfolio />);
  await user.press(await screen.findByRole('button', { name: 'Registrar operação' }));
  expect(router.push).toHaveBeenCalledWith('/operacao/nova');
});

describe('com operações', () => {
  it('mostra os KPIs com frações ×100 e o benchmark indisponível como "indisponível"', async () => {
    prepararCarteiraCompleta();
    await renderizar(<Portfolio />);

    expect(await screen.findByText('Patrimônio simulado')).toBeOnTheScreen();
    // 0,1 (fração) → +10,00%: na dica do Resultado não realizado e na linha da carteira do comparativo.
    expect(await screen.findAllByText('+10,00%')).toHaveLength(2);
    expect(screen.getByText(`R$${NBSP}12,50`)).toBeOnTheScreen();
    // Comparativo: CDI null → indisponível; Ibovespa 0,02 (fração) → +2,00%
    expect(await screen.findByText('+2,00%')).toBeOnTheScreen();
    expect(screen.getByText('indisponível')).toBeOnTheScreen();
  });

  it('mostra o ticker das operações e o aviso de simulação', async () => {
    prepararCarteiraCompleta();
    await renderizar(<Portfolio />);
    expect(await screen.findByText('Compra · PETR4')).toBeOnTheScreen();
    expect(screen.getByText(/Carteira simulada/)).toBeOnTheScreen();
  });

  it('a posição mostra a variação do dia da cotação em pontos percentuais', async () => {
    prepararCarteiraCompleta();
    await renderizar(<Portfolio />);
    expect(await screen.findAllByText('▲ +1,05%')).not.toHaveLength(0);
  });

  it('cotação do ativo indisponível mostra "Hoje —" na posição', async () => {
    prepararCarteiraCompleta();
    jest.mocked(ativosApi.cotacao).mockRejectedValue(new ApiError(404, 'Cotacao nao encontrada para o ativo'));
    await renderizar(<Portfolio />);
    expect(await screen.findByText('Hoje —')).toBeOnTheScreen();
  });

  it('tocar numa posição abre o detalhe do ativo', async () => {
    const user = userEvent.setup();
    prepararCarteiraCompleta();
    await renderizar(<Portfolio />);
    await user.press(await screen.findByRole('button', { name: /^PETR4/ }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1', ticker: 'PETR4' } });
  });
});

describe('dados parciais (ativo sem cotação)', () => {
  it('avisa quando uma operação tem saldo e o backend omitiu a posição', async () => {
    prepararCarteiraCompleta();
    jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([compra('o-1'), compra('o-2', 'a-2')]);
    jest.mocked(watchlistApi.listar).mockResolvedValue([item('a-1', 'PETR4'), item('a-2', 'VALE3')]);
    await renderizar(<Portfolio />);
    expect(await screen.findByText(/Sem cotação agora para VALE3/)).toBeOnTheScreen();
  });

  it('com todas as posições cotadas não mostra o aviso', async () => {
    prepararCarteiraCompleta();
    await renderizar(<Portfolio />);
    await screen.findByText('Compra · PETR4');
    expect(screen.queryByText(/Sem cotação agora/)).not.toBeOnTheScreen();
  });
});

describe('filtro das posições por classe', () => {
  function prepararDuasClasses() {
    prepararCarteiraCompleta();
    jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([compra('o-1'), compra('o-2', 'a-2')]);
    jest.mocked(portfolioApi.posicoes).mockResolvedValue([posicao('a-1', 'PETR4'), posicao('a-2', 'BTC')]);
    jest.mocked(watchlistApi.listar).mockResolvedValue([item('a-1', 'PETR4'), item('a-2', 'BTC', 'CRIPTO')]);
  }

  it('filtra por classe e volta para todas', async () => {
    const user = userEvent.setup();
    prepararDuasClasses();
    await renderizar(<Portfolio />);
    await user.press(await screen.findByRole('radio', { name: 'Cripto' }));
    expect(screen.queryByRole('button', { name: /^PETR4/ })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^BTC/ })).toBeOnTheScreen();
    await user.press(screen.getByRole('radio', { name: 'Todas' }));
    expect(screen.getByRole('button', { name: /^PETR4/ })).toBeOnTheScreen();
  });

  it('com uma classe só não mostra o filtro', async () => {
    prepararCarteiraCompleta();
    await renderizar(<Portfolio />);
    await screen.findByText('Compra · PETR4');
    expect(screen.queryByRole('radio', { name: 'Cripto' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('radiogroup', { name: 'Filtrar posições por classe' })).not.toBeOnTheScreen();
  });
});

it('remoção bloqueada pelo backend (422 só com UUID) mostra frase legível, nunca o UUID', async () => {
  const user = userEvent.setup();
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([compra('o-1')]);
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
});
