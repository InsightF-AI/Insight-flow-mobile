import type { Distribuicao, ItemWatchlist, Posicao } from '@/api/tipos';
import { mapaAtivos, prepararDistribuicao } from '@/dominio/portfolio';

const paleta = ['#111111', '#222222'];

const distribuicao: Distribuicao = {
  por_classe: { ACAO: '0.6', CRIPTO: '0.4', FII: '0' },
  por_setor: { 'N/A': '0.4', Petróleo: '0.6' },
  por_moeda: { BRL: '0.6', USD: '0.4' },
};

describe('prepararDistribuicao', () => {
  it('ordena do maior para o menor, descarta zeros e usa rótulos pt-BR', () => {
    expect(prepararDistribuicao(distribuicao, 'classe', paleta)).toEqual([
      { rotulo: 'Ações', valor: 0.6, cor: '#111111' },
      { rotulo: 'Criptomoedas', valor: 0.4, cor: '#222222' },
    ]);
  });

  it('setor "N/A" vira "Sem setor"', () => {
    expect(prepararDistribuicao(distribuicao, 'setor', paleta).map((fatia) => fatia.rotulo)).toEqual([
      'Petróleo',
      'Sem setor',
    ]);
  });

  it('repete a paleta quando há mais fatias que cores', () => {
    const muitas: Distribuicao = { por_classe: {}, por_setor: {}, por_moeda: { BRL: '0.5', USD: '0.3', EUR: '0.2' } };
    expect(prepararDistribuicao(muitas, 'moeda', paleta).map((fatia) => fatia.cor)).toEqual([
      '#111111',
      '#222222',
      '#111111',
    ]);
  });
});

describe('mapaAtivos', () => {
  const posicao = { ativo_id: 'a-1', ticker: 'PETR4' } as Posicao;
  const itemWatchlist: ItemWatchlist = {
    ativo: { id: 'a-2', ticker: 'AAPL34', nome: 'Apple', tipo: 'BDR', setor: null, moeda: 'USD' },
    notificar: true,
    adicionado_em: '2026-09-25T12:00:00Z',
  };

  it('junta posições e watchlist; a watchlist traz a moeda e o tipo', () => {
    const mapa = mapaAtivos([posicao], [itemWatchlist]);
    expect(mapa.get('a-1')).toEqual({ ticker: 'PETR4' });
    expect(mapa.get('a-2')).toEqual({ ticker: 'AAPL34', moeda: 'USD', tipo: 'BDR' });
  });

  it('aceita consultas ainda sem dados', () => {
    expect(mapaAtivos(undefined, undefined).size).toBe(0);
  });
});
