import type { ItemWatchlist, Operacao, Posicao } from '@/api/tipos';
import {
  ativosSemCotacao,
  descreverDadosParciais,
  filtrarPosicoes,
  filtrosDasPosicoes,
  mapaAtivos,
  quantidadeDisponivel,
  rotuloDoFiltro,
} from '@/dominio/portfolio';

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

function item(id: string, ticker: string, tipo: ItemWatchlist['ativo']['tipo']): ItemWatchlist {
  return {
    ativo: { id, ticker, nome: ticker, tipo, setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-10-01T12:00:00Z',
  };
}

function operacao(id: string, ativoId: string, tipo: Operacao['tipo'], quantidade: string): Operacao {
  return { id, ativo_id: ativoId, tipo, quantidade, preco_unitario: '10', data: '2026-09-01', criado_em: '2026-09-01T12:00:00Z' };
}

describe('mapaAtivos', () => {
  it('guarda o tipo do ativo quando ele está na watchlist', () => {
    const mapa = mapaAtivos([posicao('a-1', 'PETR4')], [item('a-1', 'PETR4', 'ACAO')]);
    expect(mapa.get('a-1')).toEqual({ ticker: 'PETR4', moeda: 'BRL', tipo: 'ACAO' });
  });

  it('ativo só nas posições (saiu da watchlist) não tem tipo nem moeda', () => {
    expect(mapaAtivos([posicao('a-1', 'PETR4')], []).get('a-1')).toEqual({ ticker: 'PETR4' });
  });
});

describe('filtros das posições', () => {
  const ativos = mapaAtivos(undefined, [
    item('a-1', 'PETR4', 'ACAO'),
    item('a-2', 'VALE3', 'ACAO'),
    item('a-3', 'BTC', 'CRIPTO'),
  ]);

  it('mostra só as classes que existem, na ordem fixa, com "Todas" na frente', () => {
    const posicoes = [posicao('a-3', 'BTC'), posicao('a-1', 'PETR4'), posicao('a-2', 'VALE3')];
    expect(filtrosDasPosicoes(posicoes, ativos)).toEqual(['TODAS', 'ACAO', 'CRIPTO']);
  });

  it('uma classe só não tem filtro útil', () => {
    expect(filtrosDasPosicoes([posicao('a-1', 'PETR4'), posicao('a-2', 'VALE3')], ativos)).toEqual(['TODAS']);
    expect(filtrosDasPosicoes([], ativos)).toEqual(['TODAS']);
  });

  it('posição de ativo que saiu da watchlist cai em "Outros"', () => {
    const posicoes = [posicao('a-1', 'PETR4'), posicao('a-9', 'ITUB4')];
    expect(filtrosDasPosicoes(posicoes, ativos)).toEqual(['TODAS', 'ACAO', 'OUTROS']);
    expect(filtrarPosicoes(posicoes, ativos, 'OUTROS').map((p) => p.ticker)).toEqual(['ITUB4']);
  });

  it('filtra por classe e "Todas" devolve tudo', () => {
    const posicoes = [posicao('a-1', 'PETR4'), posicao('a-3', 'BTC')];
    expect(filtrarPosicoes(posicoes, ativos, 'CRIPTO').map((p) => p.ticker)).toEqual(['BTC']);
    expect(filtrarPosicoes(posicoes, ativos, 'TODAS')).toHaveLength(2);
  });

  it('rótulos curtos', () => {
    expect(rotuloDoFiltro('TODAS')).toBe('Todas');
    expect(rotuloDoFiltro('ACAO')).toBe('Ações');
    expect(rotuloDoFiltro('CRIPTO')).toBe('Cripto');
    expect(rotuloDoFiltro('OUTROS')).toBe('Outros');
  });
});

describe('ativosSemCotacao', () => {
  it('ativo com saldo comprado e sem posição é um ativo que o backend não conseguiu cotar', () => {
    const operacoes = [operacao('o-1', 'a-1', 'COMPRA', '10'), operacao('o-2', 'a-2', 'COMPRA', '5')];
    expect(ativosSemCotacao(operacoes, [posicao('a-1', 'PETR4')])).toEqual(['a-2']);
  });

  it('posição zerada por venda total não é falta de cotação', () => {
    const operacoes = [operacao('o-1', 'a-2', 'COMPRA', '5'), operacao('o-2', 'a-2', 'VENDA', '5')];
    expect(ativosSemCotacao(operacoes, [])).toEqual([]);
  });

  it('venda parcial deixa saldo e conta como sem cotação quando a posição some', () => {
    const operacoes = [operacao('o-1', 'a-2', 'COMPRA', '5'), operacao('o-2', 'a-2', 'VENDA', '2')];
    expect(ativosSemCotacao(operacoes, [])).toEqual(['a-2']);
  });

  it('sem operações não há o que avisar', () => {
    expect(ativosSemCotacao([], [])).toEqual([]);
  });
});

describe('descreverDadosParciais', () => {
  const ativos = mapaAtivos(undefined, [
    item('a-1', 'PETR4', 'ACAO'),
    item('a-2', 'VALE3', 'ACAO'),
    item('a-3', 'ITUB4', 'ACAO'),
    item('a-4', 'BBAS3', 'ACAO'),
  ]);

  it('sem ativos sem cotação não há aviso', () => {
    expect(descreverDadosParciais([], ativos)).toBeNull();
  });

  it('nomeia os ativos e explica o efeito', () => {
    expect(descreverDadosParciais(['a-2'], ativos)).toBe(
      'Sem cotação agora para VALE3: o valor de mercado e o resultado da carteira podem estar incompletos.',
    );
  });

  it('com mais de três nomeia três e conta o resto', () => {
    expect(descreverDadosParciais(['a-1', 'a-2', 'a-3', 'a-4'], ativos)).toContain('PETR4, VALE3, ITUB4 e mais 1');
  });

  it('ativo desconhecido entra só na contagem', () => {
    expect(descreverDadosParciais(['a-9', 'a-8'], ativos)).toContain('Sem cotação agora para 2 ativos:');
  });
});

describe('quantidadeDisponivel', () => {
  it('é o saldo das operações: compras menos vendas', () => {
    const operacoes = [
      operacao('o-1', 'a-1', 'COMPRA', '10'),
      operacao('o-2', 'a-1', 'COMPRA', '5.5'),
      operacao('o-3', 'a-1', 'VENDA', '3'),
      operacao('o-4', 'a-2', 'COMPRA', '99'),
    ];
    expect(quantidadeDisponivel(operacoes, 'a-1')).toBeCloseTo(12.5, 8);
  });

  it('ativo sem operações tem zero, e saldo negativo (operações inconsistentes) vira zero', () => {
    expect(quantidadeDisponivel([], 'a-1')).toBe(0);
    expect(quantidadeDisponivel([operacao('o-1', 'a-1', 'VENDA', '4')], 'a-1')).toBe(0);
  });
});

describe('quantidadeDisponivel: ponto flutuante', () => {
  it('0,1 + 0,2 − 0,3 é zero, não 5,55e-17', () => {
    const operacoes = [
      operacao('o-1', 'a-1', 'COMPRA', '0.1'),
      operacao('o-2', 'a-1', 'COMPRA', '0.2'),
      operacao('o-3', 'a-1', 'VENDA', '0.3'),
    ];
    expect(quantidadeDisponivel(operacoes, 'a-1')).toBe(0);
  });
});
