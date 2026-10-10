import type {
  Ativo,
  CotacaoAtual,
  ItemWatchlist,
  Notificacao,
  Posicao,
  Rentabilidade,
  ResultadoBacktest,
  Sinal,
} from '@/api/tipos';
import {
  carteiraVazia,
  descreverBacktest,
  kpiPatrimonio,
  kpiResultado,
  kpiSinais,
  kpiVariacaoDoDia,
  ordenarWatchlist,
  reunirSinais,
  ultimoResumoDiario,
  variacaoDoDia,
} from '@/dominio/inicio';
import { AVISO_IA } from '@/dominio/regulatorio';

const NBSP = ' ';

function ativo(id: string, ticker: string): Ativo {
  return { id, ticker, nome: ticker, tipo: 'ACAO', setor: null, moeda: 'BRL' };
}

function item(id: string, ticker: string): ItemWatchlist {
  return { ativo: ativo(id, ticker), notificar: true, adicionado_em: '2026-10-01T12:00:00Z' };
}

function posicao(ativoId: string, valorBrl: string): Posicao {
  return {
    ativo_id: ativoId,
    ticker: ativoId.toUpperCase(),
    quantidade: '1',
    preco_medio: '1',
    cotacao_atual: '1',
    valor_mercado: valorBrl,
    valor_mercado_brl: valorBrl,
    lucro_nao_realizado: '0',
    lucro_realizado: '0',
  };
}

function cotacao(variacaoPercentual: string): CotacaoAtual {
  return {
    ticker: 'X',
    preco: '10',
    variacao: '0',
    variacao_percentual: variacaoPercentual,
    maxima_dia: '10',
    minima_dia: '10',
    volume: '0',
  };
}

function rentabilidade(parcial: Partial<Rentabilidade> = {}): Rentabilidade {
  return {
    custo_base_brl: '3750.00',
    valor_mercado_brl: '4000.00',
    lucro_nao_realizado_brl: '250.00',
    lucro_realizado_brl: '0',
    percentual: '0.0667',
    ...parcial,
  };
}

const RENTABILIDADE_ZERADA = rentabilidade({
  custo_base_brl: '0',
  valor_mercado_brl: '0',
  lucro_nao_realizado_brl: '0',
  lucro_realizado_brl: '0',
  percentual: '0',
});

describe('ordenarWatchlist', () => {
  it('ordena por ticker, sem alterar a lista recebida', () => {
    const recebida = [item('a-3', 'VALE3'), item('a-1', 'PETR4'), item('a-2', 'BTC')];
    const ordenada = ordenarWatchlist(recebida);
    expect(ordenada.map((i) => i.ativo.ticker)).toEqual(['BTC', 'PETR4', 'VALE3']);
    expect(recebida.map((i) => i.ativo.ticker)).toEqual(['VALE3', 'PETR4', 'BTC']);
  });
});

describe('variacaoDoDia', () => {
  it('pondera pelo valor de mercado em BRL', () => {
    const cotacoes = new Map([
      ['a-1', cotacao('2.00')],
      ['a-2', cotacao('-2.00')],
    ]);
    const v = variacaoDoDia([posicao('a-1', '3000.00'), posicao('a-2', '1000.00')], cotacoes);
    expect(v).toEqual({ pontos: 1, consideradas: 2, total: 2 });
  });

  it('usa só as posições com cotação e informa quantas entraram', () => {
    const cotacoes = new Map([['a-1', cotacao('2.00')]]);
    const v = variacaoDoDia([posicao('a-1', '3000.00'), posicao('a-2', '1000.00')], cotacoes);
    expect(v).toEqual({ pontos: 2, consideradas: 1, total: 2 });
  });

  it('sem nenhuma cotação o resultado é null, nunca zero', () => {
    const v = variacaoDoDia([posicao('a-1', '3000.00')], new Map());
    expect(v).toEqual({ pontos: null, consideradas: 0, total: 1 });
  });

  it('sem posições o total é zero', () => {
    expect(variacaoDoDia([], new Map())).toEqual({ pontos: null, consideradas: 0, total: 0 });
  });

  it('ignora cotação com valor que não é número', () => {
    const cotacoes = new Map([['a-1', cotacao('abc')]]);
    expect(variacaoDoDia([posicao('a-1', '3000.00')], cotacoes).consideradas).toBe(0);
  });
});

describe('carteiraVazia', () => {
  it('verdadeiro quando tudo é zero, em qualquer grafia', () => {
    expect(carteiraVazia(RENTABILIDADE_ZERADA)).toBe(true);
    expect(
      carteiraVazia(rentabilidade({ custo_base_brl: '0.00', valor_mercado_brl: '0.000', lucro_realizado_brl: '0' })),
    ).toBe(true);
  });

  it('falso quando só há lucro realizado (posições encerradas)', () => {
    expect(carteiraVazia({ ...RENTABILIDADE_ZERADA, lucro_realizado_brl: '120.00' })).toBe(false);
  });
});

describe('KPIs', () => {
  it('patrimônio mostra valor de mercado e custo', () => {
    expect(kpiPatrimonio(rentabilidade())).toEqual({
      valor: `R$${NBSP}4.000,00`,
      dica: `Custo R$${NBSP}3.750,00`,
      cor: 'padrao',
    });
  });

  it('patrimônio de carteira vazia é traço com orientação, não R$ 0,00', () => {
    expect(kpiPatrimonio(RENTABILIDADE_ZERADA)).toEqual({
      valor: '—',
      dica: 'Registre uma operação simulada',
      cor: 'padrao',
    });
  });

  it('resultado positivo é verde e mostra o percentual em fração × 100', () => {
    expect(kpiResultado(rentabilidade())).toEqual({ valor: `R$${NBSP}250,00`, dica: '+6,67%', cor: 'positivo' });
  });

  it('resultado negativo é vermelho e usa o sinal do número', () => {
    const k = kpiResultado(rentabilidade({ lucro_nao_realizado_brl: '-12.5', percentual: '-0.0033' }));
    expect(k.cor).toBe('negativo');
    expect(k.valor).toContain('12,50');
    expect(k.valor.startsWith('-')).toBe(true);
    expect(k.dica).toBe('-0,33%');
  });

  it('resultado quase zero é neutro e nunca "−0,00%"', () => {
    const k = kpiResultado(rentabilidade({ lucro_nao_realizado_brl: '-0.001', percentual: '-0.00001' }));
    expect(k.cor).toBe('padrao');
    expect(k.dica).toBe('0,00%');
  });

  it('resultado de carteira vazia é traço', () => {
    expect(kpiResultado(RENTABILIDADE_ZERADA)).toEqual({ valor: '—', cor: 'padrao' });
  });

  it('variação do dia completa', () => {
    expect(kpiVariacaoDoDia({ pontos: 1, consideradas: 2, total: 2 })).toEqual({
      valor: '+1,00%',
      dica: 'Ponderada pelo valor em BRL',
      cor: 'positivo',
    });
  });

  it('variação do dia parcial informa quantas posições entraram', () => {
    const k = kpiVariacaoDoDia({ pontos: -0.5, consideradas: 1, total: 2 });
    expect(k).toEqual({ valor: '-0,50%', dica: '1 de 2 posições, ponderada pelo valor', cor: 'negativo' });
  });

  it('variação do dia sem cotação é "indisponível", nunca 0,00%', () => {
    expect(kpiVariacaoDoDia({ pontos: null, consideradas: 0, total: 2 })).toEqual({
      valor: 'indisponível',
      dica: 'Sem cotação das posições',
      cor: 'padrao',
    });
  });

  it('variação do dia sem posições é traço', () => {
    expect(kpiVariacaoDoDia({ pontos: null, consideradas: 0, total: 0 })).toEqual({
      valor: '—',
      dica: 'Sem posições abertas',
      cor: 'padrao',
    });
  });

  it('sinais ativos informam os ativos sem dados', () => {
    expect(kpiSinais({ total: 3, semDados: 0 })).toEqual({ valor: '3', cor: 'padrao' });
    expect(kpiSinais({ total: 3, semDados: 1 })).toEqual({ valor: '3', dica: '1 ativo sem dados', cor: 'padrao' });
    expect(kpiSinais({ total: 0, semDados: 2 }).dica).toBe('2 ativos sem dados');
  });
});

describe('ultimoResumoDiario', () => {
  function notificacao(parcial: Partial<Notificacao>): Notificacao {
    return {
      id: 'n-1',
      ativo_id: null,
      tipo: 'RESUMO_DIARIO',
      mensagem: 'Resumo diario da carteira',
      contexto: { texto: 'A carteira variou +1,00%.', aviso_legal: 'Aviso do servidor.' },
      lida: false,
      criado_em: '2026-10-09T21:30:00Z',
      ...parcial,
    };
  }

  it('devolve o mais recente, com o texto e o aviso do servidor', () => {
    const resumo = ultimoResumoDiario([
      notificacao({ id: 'antigo', criado_em: '2026-10-08T21:30:00Z', contexto: { texto: 'Ontem.', aviso_legal: 'A.' } }),
      notificacao({ id: 'novo' }),
    ]);
    expect(resumo).toEqual({
      texto: 'A carteira variou +1,00%.',
      avisoLegal: 'Aviso do servidor.',
      geradoEm: '2026-10-09T21:30:00Z',
    });
  });

  it('sem aviso no contexto usa o aviso legal padrão', () => {
    const resumo = ultimoResumoDiario([notificacao({ contexto: { texto: 'Texto.' } })]);
    expect(resumo?.avisoLegal).toBe(AVISO_IA);
  });

  it.each([{}, { texto: '' }, { texto: '   ' }, { texto: 42 }])(
    'contexto sem texto utilizável (%o) não vira resumo',
    (contexto) => {
      expect(ultimoResumoDiario([notificacao({ contexto })])).toBeNull();
    },
  );

  it('ignora outros tipos de notificação e lista ausente', () => {
    expect(ultimoResumoDiario([notificacao({ tipo: 'ALERTA_DISPARADO' })])).toBeNull();
    expect(ultimoResumoDiario(undefined)).toBeNull();
    expect(ultimoResumoDiario([])).toBeNull();
  });

  it('compara pela data, não pelo texto (microssegundos)', () => {
    const resumo = ultimoResumoDiario([
      notificacao({ id: 'a', criado_em: '2026-10-09T21:30:00.500000Z', contexto: { texto: 'Mais novo.' } }),
      notificacao({ id: 'b', criado_em: '2026-10-09T21:30:00Z', contexto: { texto: 'Mais velho.' } }),
    ]);
    expect(resumo?.texto).toBe('Mais novo.');
  });
});

describe('reunirSinais', () => {
  function sinal(id: string, ativoId: string, ativadoEm: string, desativadoEm: string | null = null): Sinal {
    return {
      id,
      ativo_id: ativoId,
      regra_id: 'r-1',
      regra_nome: 'Sobrevenda RSI',
      regra_descricao: 'RSI(14) abaixo de 30',
      data_ativacao: ativadoEm,
      contexto: { valor: '28.4' },
      data_desativacao: desativadoEm,
    };
  }

  it('junta os sinais vigentes, do mais recente para o mais antigo, ignorando ativos sem dados', () => {
    const itens = [item('a-1', 'PETR4'), item('a-2', 'VALE3'), item('a-3', 'BTC')];
    const lista = reunirSinais(
      itens,
      new Map([
        ['a-1', [sinal('s-1', 'a-1', '2026-10-08T13:00:00Z')]],
        [
          'a-2',
          [
            sinal('s-2', 'a-2', '2026-10-09T13:00:00Z'),
            sinal('s-3', 'a-2', '2026-10-01T13:00:00Z', '2026-10-02T13:00:00Z'),
          ],
        ],
        ['a-3', undefined],
      ]),
    );
    expect(lista.map((s) => s.sinal.id)).toEqual(['s-2', 's-1']);
    expect(lista[0].ativo.ticker).toBe('VALE3');
  });
});

describe('descreverBacktest', () => {
  function backtest(parcial: Partial<ResultadoBacktest>): ResultadoBacktest {
    return {
      regra_id: 'r-1',
      ativo_id: 'a-1',
      total_ocorrencias: 14,
      retorno_medio_5_pregoes: '1.8',
      retorno_medio_20_pregoes: '3.2',
      retorno_medio_60_pregoes: null,
      ...parcial,
    };
  }

  it('descreve ocorrências e o retorno médio em 20 pregões', () => {
    expect(descreverBacktest(backtest({}))).toBe('14 ocorrências em 24 meses · retorno médio +3,20% em 20 pregões');
  });

  it('singular e retorno negativo', () => {
    expect(descreverBacktest(backtest({ total_ocorrencias: 1, retorno_medio_20_pregoes: '-2.5' }))).toBe(
      '1 ocorrência em 24 meses · retorno médio -2,50% em 20 pregões',
    );
  });

  it('retorno de 20 pregões nulo não vira zero', () => {
    expect(descreverBacktest(backtest({ retorno_medio_20_pregoes: null }))).toBe(
      '14 ocorrências em 24 meses · retorno médio em 20 pregões indisponível',
    );
  });

  it('sem ocorrências', () => {
    expect(descreverBacktest(backtest({ total_ocorrencias: 0, retorno_medio_20_pregoes: null }))).toBe(
      'Sem ocorrências nos últimos 24 meses',
    );
  });
});
