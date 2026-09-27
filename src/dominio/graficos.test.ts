import type { PontoHistorico } from '@/api/tipos';
import { corDaVariacao, prepararSeriePreco } from '@/dominio/graficos';

function ponto(data: string, fechamento: string): PontoHistorico {
  return { data, abertura: fechamento, maxima: fechamento, minima: fechamento, fechamento, volume: '1000' };
}

it('ordena por data, converte decimais e calcula mínimo, máximo e variação', () => {
  const serie = prepararSeriePreco([
    ponto('2026-09-03T00:00:00Z', '12'),
    ponto('2026-09-01T00:00:00Z', '10'),
    ponto('2026-09-02T00:00:00Z', '9'),
  ]);
  expect(serie).toEqual({
    pontos: [
      { indice: 0, fechamento: 10 },
      { indice: 1, fechamento: 9 },
      { indice: 2, fechamento: 12 },
    ],
    minimo: 9,
    maximo: 12,
    inicio: '2026-09-01T00:00:00Z',
    fim: '2026-09-03T00:00:00Z',
    variacaoPercentual: 20,
  });
});

it('menos de 2 pontos não forma gráfico', () => {
  expect(prepararSeriePreco([])).toBeNull();
  expect(prepararSeriePreco([ponto('2026-09-01T00:00:00Z', '10')])).toBeNull();
});

it('descarta fechamentos que não são números', () => {
  const serie = prepararSeriePreco([
    ponto('2026-09-01T00:00:00Z', '10'),
    ponto('2026-09-02T00:00:00Z', 'NaN'),
    ponto('2026-09-03T00:00:00Z', '11'),
  ]);
  expect(serie?.pontos).toHaveLength(2);
});

describe('corDaVariacao', () => {
  const grafico = { alta: '#00ff00', baixa: '#ff0000' };

  it('variação positiva ou zero usa a cor de alta', () => {
    expect(corDaVariacao(1.5, grafico)).toBe('#00ff00');
    expect(corDaVariacao(0, grafico)).toBe('#00ff00');
  });

  it('variação negativa usa a cor de baixa', () => {
    expect(corDaVariacao(-0.01, grafico)).toBe('#ff0000');
  });
});
