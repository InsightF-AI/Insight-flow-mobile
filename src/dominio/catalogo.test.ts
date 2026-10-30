import type { Ativo } from '@/api/tipos';
import { juntarAtivos, sugerirTickers } from '@/dominio/catalogo';

function ativo(id: string, ticker: string, nome = ticker): Ativo {
  return { id, ticker, nome, tipo: 'ACAO', setor: null, moeda: 'BRL' };
}

describe('juntarAtivos', () => {
  it('põe a watchlist primeiro e não repete o ticker que também está no catálogo', () => {
    const watchlist = [ativo('w-1', 'VALE3')];
    const catalogo = [ativo('c-1', 'BTC'), ativo('c-2', 'vale3'), ativo('c-3', 'PETR4')];

    expect(juntarAtivos(watchlist, catalogo).map((a) => a.id)).toEqual(['w-1', 'c-1', 'c-3']);
  });

  it('funciona com qualquer uma das listas ausente', () => {
    expect(juntarAtivos(undefined, [ativo('c-1', 'BTC')]).map((a) => a.ticker)).toEqual(['BTC']);
    expect(juntarAtivos([ativo('w-1', 'BTC')], undefined).map((a) => a.ticker)).toEqual(['BTC']);
    expect(juntarAtivos(undefined, undefined)).toEqual([]);
  });
});

describe('sugerirTickers', () => {
  const ativos = [
    ativo('1', 'PETR4', 'Petrobras'),
    ativo('2', 'VALE3', 'Vale'),
    ativo('3', 'BTC', 'Bitcoin'),
    ativo('4', 'ITUB4', 'Itaú'),
  ];

  it('sem termo, sugere os primeiros até o limite', () => {
    expect(sugerirTickers(ativos, '', 3)).toEqual(['PETR4', 'VALE3', 'BTC']);
  });

  it('com termo, filtra por ticker ou nome sem diferenciar maiúsculas', () => {
    expect(sugerirTickers(ativos, ' bit ', 10)).toEqual(['BTC']);
    expect(sugerirTickers(ativos, 'tr4', 10)).toEqual(['PETR4']);
  });

  it('some quando o termo já é exatamente um ticker da lista', () => {
    expect(sugerirTickers(ativos, 'vale3', 10)).toEqual([]);
  });
});
