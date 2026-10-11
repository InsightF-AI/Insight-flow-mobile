import { act, screen, userEvent, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { ativosApi } from '@/api/ativos';
import { ApiError } from '@/api/client';
import { notificacoesApi } from '@/api/notificacoes';
import { portfolioApi } from '@/api/portfolio';
import type {
  CotacaoAtual,
  ItemWatchlist,
  Notificacao,
  Operacao,
  Posicao,
  Rentabilidade,
  ResultadoBacktest,
  Sinal,
} from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { AVISO_IA } from '@/dominio/regulatorio';
import { chaves } from '@/hooks/chaves';
import { criarQueryClientDeTeste, renderizar } from '@/test/renderizar';

import Inicio from '../../app/(tabs)/index';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn(), definirNotificacao: jest.fn() } }));
jest.mock('@/api/ativos', () => ({ ativosApi: { cotacao: jest.fn(), sinais: jest.fn(), backtest: jest.fn() } }));
jest.mock('@/api/portfolio', () => ({
  portfolioApi: { rentabilidade: jest.fn(), posicoes: jest.fn(), listarOperacoes: jest.fn() },
}));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));

const NBSP = ' ';

function item(id: string, ticker: string, nome: string, notificar = true): ItemWatchlist {
  return {
    ativo: { id, ticker, nome, tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar,
    adicionado_em: '2026-10-01T12:00:00Z',
  };
}

function cotacao(ticker: string, preco: string, variacaoPercentual: string): CotacaoAtual {
  return {
    ticker,
    preco,
    variacao: '0',
    variacao_percentual: variacaoPercentual,
    maxima_dia: preco,
    minima_dia: preco,
    volume: '1',
  };
}

function compra(id: string, ativoId: string): Operacao {
  return {
    id,
    ativo_id: ativoId,
    tipo: 'COMPRA',
    quantidade: '100',
    preco_unitario: '30',
    data: '2026-09-01',
    criado_em: '2026-09-01T12:00:00Z',
  };
}

function posicao(ativoId: string, ticker: string, valorBrl: string): Posicao {
  return {
    ativo_id: ativoId,
    ticker,
    quantidade: '100',
    preco_medio: '30',
    cotacao_atual: '38',
    valor_mercado: valorBrl,
    valor_mercado_brl: valorBrl,
    lucro_nao_realizado: '0',
    lucro_realizado: '0',
  };
}

const RENTABILIDADE: Rentabilidade = {
  custo_base_brl: '3750.00',
  valor_mercado_brl: '4000.00',
  lucro_nao_realizado_brl: '250.00',
  lucro_realizado_brl: '0',
  percentual: '0.0667',
};

const RENTABILIDADE_ZERADA: Rentabilidade = {
  custo_base_brl: '0',
  valor_mercado_brl: '0',
  lucro_nao_realizado_brl: '0',
  lucro_realizado_brl: '0',
  percentual: '0',
};

const SINAL: Sinal = {
  id: 's-1',
  ativo_id: 'a-1',
  regra_id: 'r-1',
  regra_nome: 'Sobrevenda RSI',
  regra_descricao: 'RSI(14) abaixo de 30',
  data_ativacao: '2026-10-09T13:00:00Z',
  contexto: { valor: '28.4' },
  data_desativacao: null,
};

const BACKTEST: ResultadoBacktest = {
  regra_id: 'r-1',
  ativo_id: 'a-1',
  total_ocorrencias: 14,
  retorno_medio_5_pregoes: '1.8',
  retorno_medio_20_pregoes: '3.2',
  retorno_medio_60_pregoes: null,
};

const RESUMO: Notificacao = {
  id: 'n-1',
  ativo_id: null,
  tipo: 'RESUMO_DIARIO',
  mensagem: 'Resumo diario da carteira',
  contexto: { texto: 'A carteira variou +1,00% no dia.', aviso_legal: AVISO_IA },
  lida: false,
  criado_em: '2026-10-09T21:30:00Z',
};

/** Cenário completo: PETR4 e VALE3 (a API devolve fora de ordem), uma posição em cada e um sinal em PETR4. */
function prepararComDados() {
  jest
    .mocked(watchlistApi.listar)
    .mockResolvedValue([item('a-2', 'VALE3', 'Vale ON'), item('a-1', 'PETR4', 'Petrobras PN')]);
  jest
    .mocked(ativosApi.cotacao)
    .mockImplementation(async (ativoId: string) =>
      ativoId === 'a-1' ? cotacao('PETR4', '38.5', '2.00') : cotacao('VALE3', '60', '-2.00'),
    );
  jest.mocked(ativosApi.sinais).mockImplementation(async (ativoId: string) => (ativoId === 'a-1' ? [SINAL] : []));
  jest.mocked(ativosApi.backtest).mockResolvedValue(BACKTEST);
  jest.mocked(portfolioApi.rentabilidade).mockResolvedValue(RENTABILIDADE);
  jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([compra('o-1', 'a-1'), compra('o-2', 'a-2')]);
  jest
    .mocked(portfolioApi.posicoes)
    .mockResolvedValue([posicao('a-1', 'PETR4', '3000.00'), posicao('a-2', 'VALE3', '1000.00')]);
  jest.mocked(notificacoesApi.listar).mockResolvedValue([RESUMO]);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  jest.mocked(watchlistApi.definirNotificacao).mockResolvedValue(item('a-1', 'PETR4', 'Petrobras PN', false));
  jest.mocked(ativosApi.cotacao).mockResolvedValue(cotacao('X', '10', '0'));
  jest.mocked(ativosApi.sinais).mockResolvedValue([]);
  jest.mocked(ativosApi.backtest).mockResolvedValue(BACKTEST);
  jest.mocked(portfolioApi.rentabilidade).mockResolvedValue(RENTABILIDADE_ZERADA);
  jest.mocked(portfolioApi.posicoes).mockResolvedValue([]);
  jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([]);
  jest.mocked(notificacoesApi.listar).mockResolvedValue([]);
});

describe('com dados', () => {
  it('mostra os KPIs da carteira', async () => {
    prepararComDados();
    await renderizar(<Inicio />);
    expect(await screen.findByText(`R$${NBSP}4.000,00`)).toBeOnTheScreen();
    expect(screen.getByText(`Custo R$${NBSP}3.750,00`)).toBeOnTheScreen();
    expect(screen.getByText(`R$${NBSP}250,00`)).toBeOnTheScreen();
    expect(screen.getByText('+6,67%')).toBeOnTheScreen();
    expect(await screen.findByText('+1,00%')).toBeOnTheScreen();
    expect(screen.getByText('Ponderada pelo valor em BRL')).toBeOnTheScreen();
    expect(await screen.findByText('1')).toBeOnTheScreen();
  });

  it('mostra o resumo diário da IA com o aviso legal', async () => {
    prepararComDados();
    await renderizar(<Inicio />);
    expect(await screen.findByText('A carteira variou +1,00% no dia.')).toBeOnTheScreen();
    expect(screen.getByText('Gerado em 09/10/2026 18:30')).toBeOnTheScreen();
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
  });

  it('lista a watchlist em ordem alfabética, com preço, variação e selo de sinais', async () => {
    prepararComDados();
    await renderizar(<Inicio />);
    expect(await screen.findByText(`R$${NBSP}38,50`)).toBeOnTheScreen();
    expect(screen.getByText('▲ +2,00%')).toBeOnTheScreen();
    expect(await screen.findByText('1 sinal')).toBeOnTheScreen();
    const linhas = screen.getAllByRole('button', { name: /^(PETR4|VALE3), (Petrobras PN|Vale ON)$/ });
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toHaveAccessibleName('PETR4, Petrobras PN');
    expect(linhas[1]).toHaveAccessibleName('VALE3, Vale ON');
  });

  it('lista os sinais ativos com o histórico de 20 pregões e abre o ativo ao tocar', async () => {
    const user = userEvent.setup();
    prepararComDados();
    await renderizar(<Inicio />);
    expect(await screen.findByText('14 ocorrências em 24 meses · retorno médio +3,20% em 20 pregões')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'PETR4, Sobrevenda RSI' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1', ticker: 'PETR4' } });
  });

  it('tocar na linha da watchlist abre o detalhe com id e ticker', async () => {
    const user = userEvent.setup();
    prepararComDados();
    await renderizar(<Inicio />);
    await user.press(await screen.findByRole('button', { name: 'PETR4, Petrobras PN' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1', ticker: 'PETR4' } });
  });

  it('o sino alterna as notificações do ativo sem abri-lo', async () => {
    const user = userEvent.setup();
    prepararComDados();
    await renderizar(<Inicio />);
    const sino = await screen.findByRole('switch', { name: 'Notificações de PETR4' });
    expect(sino).toBeChecked();
    await user.press(sino);
    await waitFor(() => expect(watchlistApi.definirNotificacao).toHaveBeenCalledWith('a-1', false));
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('vazio', () => {
  it('conta nova: traços nos KPIs, sem R$ 0,00, e oferece a busca', async () => {
    const user = userEvent.setup();
    await renderizar(<Inicio />);
    expect(await screen.findByText('Sua watchlist está vazia.')).toBeOnTheScreen();
    expect(await screen.findAllByText('Registre uma operação simulada')).toHaveLength(2);
    expect(await screen.findByText('Sem posições abertas')).toBeOnTheScreen();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText(`R$${NBSP}0,00`)).not.toBeOnTheScreen();
    expect(screen.queryByText('0,00%')).not.toBeOnTheScreen();
    expect(await screen.findByText(/Nenhum resumo gerado ainda/)).toBeOnTheScreen();
    expect(screen.getByText('Nenhum sinal técnico ativo no momento.')).toBeOnTheScreen();
    expect(screen.queryByText(AVISO_IA)).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Buscar ativo' }));
    expect(router.push).toHaveBeenCalledWith('/buscar');
  });
});

describe('carregando', () => {
  it('mostra esqueletos enquanto a API não responde', async () => {
    const pendente = () => new Promise<never>(() => {});
    jest.mocked(watchlistApi.listar).mockImplementation(pendente);
    jest.mocked(portfolioApi.rentabilidade).mockImplementation(pendente);
    jest.mocked(portfolioApi.posicoes).mockImplementation(pendente);
    jest.mocked(notificacoesApi.listar).mockImplementation(pendente);
    await renderizar(<Inicio />);
    expect(screen.getAllByLabelText('Carregando').length).toBeGreaterThan(5);
    expect(screen.queryByText('Sua watchlist está vazia.')).not.toBeOnTheScreen();
  });
});

describe('falha de comunicação', () => {
  it('mostra o erro com o endereço, só na seção afetada, e tenta de novo', async () => {
    const user = userEvent.setup();
    prepararComDados();
    jest
      .mocked(watchlistApi.listar)
      .mockRejectedValueOnce(new ApiError(0, 'Sem conexão com o servidor (http://api.teste)', { causa: 'rede' }));
    await renderizar(<Inicio />);
    expect(await screen.findByText('Sem conexão com o servidor (http://api.teste)')).toBeOnTheScreen();
    // O resto da tela continua funcionando.
    expect(await screen.findByText(`R$${NBSP}4.000,00`)).toBeOnTheScreen();
    jest.mocked(watchlistApi.listar).mockResolvedValue([item('a-1', 'PETR4', 'Petrobras PN')]);
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('button', { name: 'PETR4, Petrobras PN' })).toBeOnTheScreen();
    expect(watchlistApi.listar).toHaveBeenCalledTimes(2);
  });
});

describe('erro do servidor', () => {
  it('traduz o 500 e mostra o código do erro', async () => {
    jest.mocked(watchlistApi.listar).mockRejectedValue(new ApiError(500, 'Erro 500', { requestId: 'srv-42' }));
    await renderizar(<Inicio />);
    expect(await screen.findByText('Erro no servidor. Tente novamente em instantes.')).toBeOnTheScreen();
    expect(screen.getByText('Código do erro: srv-42')).toBeOnTheScreen();
  });

  it('resumo diário com erro não esconde o resto da tela', async () => {
    prepararComDados();
    jest.mocked(notificacoesApi.listar).mockRejectedValue(new ApiError(500, 'Erro 500'));
    await renderizar(<Inicio />);
    expect(await screen.findByText('Resumo diário indisponível no momento.')).toBeOnTheScreen();
    expect(await screen.findByText(`R$${NBSP}4.000,00`)).toBeOnTheScreen();
    expect(screen.queryByText(AVISO_IA)).not.toBeOnTheScreen();
  });

  it('rentabilidade com erro mostra "indisponível" nos KPIs da carteira', async () => {
    prepararComDados();
    jest
      .mocked(portfolioApi.rentabilidade)
      .mockRejectedValue(new ApiError(503, 'Fonte de dados de mercado indisponivel'));
    await renderizar(<Inicio />);
    expect(await screen.findAllByText('indisponível')).toHaveLength(2);
    expect(await screen.findByText('+1,00%')).toBeOnTheScreen();
  });
});

describe('independência entre ativos', () => {
  it('cotação que falha vira "sem cotação" só naquele ativo, e a variação do dia usa as demais posições', async () => {
    prepararComDados();
    jest.mocked(ativosApi.cotacao).mockImplementation(async (ativoId: string) => {
      if (ativoId === 'a-2') throw new ApiError(404, 'Cotacao nao encontrada para o ativo');
      return cotacao('PETR4', '38.5', '2.00');
    });
    await renderizar(<Inicio />);
    expect(await screen.findByText('sem cotação')).toBeOnTheScreen();
    expect(await screen.findByText(`R$${NBSP}38,50`)).toBeOnTheScreen();
    expect(await screen.findByText('+2,00%')).toBeOnTheScreen();
    expect(screen.getByText('1 de 2 posições, ponderada pelo valor')).toBeOnTheScreen();
  });

  it('sinais que falham em um ativo aparecem como "sem dados" no KPI, sem derrubar os demais', async () => {
    prepararComDados();
    jest.mocked(ativosApi.sinais).mockImplementation(async (ativoId: string) => {
      if (ativoId === 'a-2') throw new ApiError(500, 'Erro 500');
      return [SINAL];
    });
    await renderizar(<Inicio />);
    expect(await screen.findByText('1 ativo sem dados')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'PETR4, Sobrevenda RSI' })).toBeOnTheScreen();
    const kpi = screen.getByText('Sinais ativos').parent?.parent;
    expect(kpi).toBeTruthy();
    expect(within(kpi!).getByText('1')).toBeOnTheScreen();
  });

  it('nenhuma posição com cotação: variação do dia é "indisponível", nunca 0,00%', async () => {
    prepararComDados();
    jest.mocked(ativosApi.cotacao).mockRejectedValue(new ApiError(503, 'Fonte de dados de mercado indisponivel'));
    await renderizar(<Inicio />);
    expect(await screen.findByText('Sem cotação das posições')).toBeOnTheScreen();
    expect(screen.queryByText('0,00%')).not.toBeOnTheScreen();
  });
});

describe('sinais sem dados (não inventa "0")', () => {
  it('com a watchlist carregando, o KPI e o bloco mostram carregamento, nunca "0" nem "Nenhum sinal"', async () => {
    jest.mocked(watchlistApi.listar).mockImplementation(() => new Promise<never>(() => {}));
    await renderizar(<Inicio />);
    expect(screen.queryByText('0')).not.toBeOnTheScreen();
    expect(screen.queryByText('Nenhum sinal técnico ativo no momento.')).not.toBeOnTheScreen();
  });

  it('com a watchlist em erro, o KPI é "indisponível" e o bloco não diz que não há sinais', async () => {
    jest.mocked(watchlistApi.listar).mockRejectedValue(new ApiError(500, 'Erro 500'));
    await renderizar(<Inicio />);
    expect(await screen.findByText('Sinais indisponíveis no momento.')).toBeOnTheScreen();
    expect(screen.getByText('Watchlist indisponível')).toBeOnTheScreen();
    expect(screen.queryByText('Nenhum sinal técnico ativo no momento.')).not.toBeOnTheScreen();
    expect(screen.queryByText('0')).not.toBeOnTheScreen();
  });

  it('com todos os ativos sem dados de sinais, o KPI é "indisponível" e o bloco oferece tentar de novo', async () => {
    prepararComDados();
    jest.mocked(ativosApi.sinais).mockRejectedValue(new ApiError(500, 'Erro 500'));
    await renderizar(<Inicio />);
    expect(await screen.findByText('Sinais indisponíveis no momento.')).toBeOnTheScreen();
    expect(screen.getByText('Sinais indisponíveis no momento')).toBeOnTheScreen();
    expect(screen.queryByText('Nenhum sinal técnico ativo no momento.')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeOnTheScreen();
  });
});

describe('fonte de dados fora do ar', () => {
  it('posições sem cotação no servidor: nada de "Sem posições abertas", "R$ 0,00" nem -100%', async () => {
    prepararComDados();
    jest.mocked(portfolioApi.rentabilidade).mockResolvedValue({
      custo_base_brl: '10000.00',
      valor_mercado_brl: '0',
      lucro_nao_realizado_brl: '-10000.00',
      lucro_realizado_brl: '0',
      percentual: '-1',
    });
    jest.mocked(portfolioApi.posicoes).mockResolvedValue([]);
    await renderizar(<Inicio />);
    expect(await screen.findAllByText('Sem cotação das posições')).toHaveLength(3);
    expect(screen.queryByText('Sem posições abertas')).not.toBeOnTheScreen();
    expect(screen.queryByText(`R$${NBSP}0,00`)).not.toBeOnTheScreen();
    expect(screen.queryByText('-100,00%')).not.toBeOnTheScreen();
  });
});

describe('sino de notificações', () => {
  it('muda na hora e bloqueia, visivelmente, os outros sinos enquanto o servidor responde', async () => {
    const user = userEvent.setup();
    prepararComDados();
    let responder: (valor: ItemWatchlist) => void = () => {};
    jest.mocked(watchlistApi.definirNotificacao).mockReturnValue(
      new Promise<ItemWatchlist>((resolver) => {
        responder = resolver;
      }),
    );
    await renderizar(<Inicio />);
    await user.press(await screen.findByRole('switch', { name: 'Notificações de PETR4' }));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Notificações de PETR4' })).not.toBeChecked());
    expect(screen.getByRole('switch', { name: 'Notificações de VALE3' })).toBeDisabled();
    responder(item('a-1', 'PETR4', 'Petrobras PN', false));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Notificações de VALE3' })).toBeEnabled());
  });

  it('desfaz a mudança e avisa quando o servidor recusa', async () => {
    const user = userEvent.setup();
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    prepararComDados();
    jest.mocked(watchlistApi.definirNotificacao).mockRejectedValue(new ApiError(500, 'Erro 500'));
    await renderizar(<Inicio />);
    await user.press(await screen.findByRole('switch', { name: 'Notificações de PETR4' }));
    await waitFor(() =>
      expect(alerta).toHaveBeenCalledWith(
        'Não foi possível alterar as notificações',
        'Erro no servidor. Tente novamente em instantes.',
      ),
    );
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Notificações de PETR4' })).toBeChecked());
  });
});

describe('falha em segundo plano não apaga o que já está na tela', () => {
  it('resumo, KPIs e watchlist continuam visíveis quando a releitura falha', async () => {
    prepararComDados();
    const queryClient = criarQueryClientDeTeste();
    await renderizar(<Inicio />, queryClient);
    expect(await screen.findByText('A carteira variou +1,00% no dia.')).toBeOnTheScreen();
    expect(await screen.findByText(`R$${NBSP}4.000,00`)).toBeOnTheScreen();
    const semRede = new ApiError(0, 'Sem conexão com o servidor (http://api.teste)', { causa: 'rede' });
    jest.mocked(notificacoesApi.listar).mockRejectedValue(semRede);
    jest.mocked(portfolioApi.rentabilidade).mockRejectedValue(semRede);
    jest.mocked(watchlistApi.listar).mockRejectedValue(semRede);
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: chaves.notificacoes });
      await queryClient.refetchQueries({ queryKey: chaves.rentabilidade });
      await queryClient.refetchQueries({ queryKey: chaves.watchlist });
    });
    expect(screen.getByText('A carteira variou +1,00% no dia.')).toBeOnTheScreen();
    expect(screen.getByText(`R$${NBSP}4.000,00`)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'PETR4, Petrobras PN' })).toBeOnTheScreen();
    expect(screen.queryByText('Resumo diário indisponível no momento.')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeOnTheScreen();
  });
});

describe('queda parcial da fonte de preços', () => {
  it('um ativo sem cotação: o resultado é "indisponível", nunca um prejuízo que não existe', async () => {
    prepararComDados();
    // a-3 tem operação e saldo, mas o backend omitiu a posição (sem cotação) e somou o custo dele.
    jest
      .mocked(portfolioApi.listarOperacoes)
      .mockResolvedValue([compra('o-1', 'a-1'), compra('o-2', 'a-2'), compra('o-3', 'a-3')]);
    jest.mocked(portfolioApi.rentabilidade).mockResolvedValue({
      custo_base_brl: '8000.00',
      valor_mercado_brl: '4000.00',
      lucro_nao_realizado_brl: '-4000.00',
      lucro_realizado_brl: '0',
      percentual: '-0.5',
    });
    await renderizar(<Inicio />);
    expect(await screen.findByText('Sem cotação de 1 ativo')).toBeOnTheScreen();
    expect(screen.getByText('Parcial: 1 ativo sem cotação')).toBeOnTheScreen();
    expect(screen.queryByText('-50,00%')).not.toBeOnTheScreen();
  });
});
