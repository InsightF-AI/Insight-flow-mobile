import type { Candle } from '@/dominio/candles';
import {
  criarGeometriaCandles,
  criarGeometriaIndicador,
  indiceDoX,
  posicoesX,
  segmentosDaSerie,
} from '@/dominio/geometriaGrafico';

function candle(fechamento: number, parcial: Partial<Candle> = {}): Candle {
  return {
    data: '2026-09-12',
    abertura: fechamento - 1,
    maxima: fechamento + 2,
    minima: fechamento - 2,
    fechamento,
    volume: 100,
    ...parcial,
  };
}

describe('posicoesX e indiceDoX', () => {
  it('distribui os candles com margem de 4 px e centro em cada passo', () => {
    const { xs, passo } = posicoesX(10, 108);
    expect(passo).toBe(10);
    expect(xs[0]).toBe(9);
    expect(xs[9]).toBe(99);
  });

  it('o toque devolve o candle mais próximo, limitado às pontas', () => {
    expect(indiceDoX(9, 10, 108)).toBe(0);
    expect(indiceDoX(39, 10, 108)).toBe(3);
    expect(indiceDoX(-50, 10, 108)).toBe(0);
    expect(indiceDoX(500, 10, 108)).toBe(9);
  });

  it('sem candles não quebra', () => {
    expect(posicoesX(0, 100).xs).toEqual([]);
    expect(indiceDoX(10, 0, 100)).toBe(0);
  });

  it('largura ainda não medida (zero) não produz NaN', () => {
    const { xs, passo } = posicoesX(5, 0);
    expect(Number.isFinite(passo)).toBe(true);
    expect(xs.every(Number.isFinite)).toBe(true);
    expect(Number.isFinite(indiceDoX(3, 5, 0))).toBe(true);
  });
});

describe('segmentosDaSerie', () => {
  it('quebra a linha onde não há valor', () => {
    const segmentos = segmentosDaSerie([null, 1, 2, null, 3], [0, 10, 20, 30, 40], (v) => 100 - v);
    expect(segmentos).toEqual([
      [
        { x: 10, y: 99 },
        { x: 20, y: 98 },
      ],
      [{ x: 40, y: 97 }],
    ]);
  });
});

describe('criarGeometriaCandles', () => {
  it('cor e corpo seguem fechamento ≥ abertura; pavio vai da máxima à mínima', () => {
    const g = criarGeometriaCandles([candle(10), candle(8, { abertura: 9 })], 108, 200);
    expect(g.corpos[0].alta).toBe(true);
    expect(g.corpos[1].alta).toBe(false);
    expect(g.pavios[0].y1).toBeLessThan(g.pavios[0].y2);
    expect(g.yPreco(12)).toBeLessThan(g.yPreco(6));
  });

  it('corpo de doji (abertura = fechamento) ainda tem altura visível', () => {
    const g = criarGeometriaCandles([candle(10, { abertura: 10 }), candle(11)], 108, 200);
    expect(g.corpos[0].altura).toBeGreaterThanOrEqual(1);
  });

  it('série parada não degenera a escala', () => {
    const parado = [10, 10, 10].map((v) => candle(v, { abertura: v, maxima: v, minima: v }));
    const g = criarGeometriaCandles(parado, 108, 200);
    for (const corpo of g.corpos) expect(Number.isFinite(corpo.y)).toBe(true);
    expect(Number.isFinite(g.yPreco(10))).toBe(true);
  });

  it('um único candle não quebra', () => {
    const g = criarGeometriaCandles([candle(10)], 108, 200);
    expect(g.xs).toHaveLength(1);
    expect(Number.isFinite(g.corpos[0].x)).toBe(true);
  });

  it('o volume mais alto ocupa o painel inteiro e candle sem volume não tem barra', () => {
    const g = criarGeometriaCandles(
      [candle(10, { volume: 100 }), candle(11, { volume: 50 }), candle(12, { volume: 0 })],
      108,
      200,
    );
    expect(g.volumes[0].altura).toBeGreaterThan(g.volumes[1].altura);
    expect(g.volumes[1].altura).toBeCloseTo(g.volumes[0].altura / 2, 8);
    expect(g.volumes[2].altura).toBe(0);
  });

  it('valores extras (Bollinger, médias) ampliam a escala para a linha não sair do quadro', () => {
    const sem = criarGeometriaCandles([candle(10), candle(11)], 108, 200);
    const com = criarGeometriaCandles([candle(10), candle(11)], 108, 200, [30]);
    expect(com.yPreco(30)).toBeGreaterThanOrEqual(0);
    expect(com.yPreco(10)).toBeGreaterThan(sem.yPreco(10));
  });

  it('extra não finito é ignorado', () => {
    const g = criarGeometriaCandles([candle(10), candle(11)], 108, 200, [Number.NaN, Infinity]);
    expect(Number.isFinite(g.yPreco(10))).toBe(true);
  });
});

describe('criarGeometriaIndicador', () => {
  const { xs, passo } = posicoesX(5, 108);

  it('RSI: domínio fixo 0–100 e linhas de referência nas posições certas', () => {
    const g = criarGeometriaIndicador({
      xs,
      passo,
      altura: 100,
      series: [[null, 20, 50, 80, 100]],
      dominio: [0, 100],
      referencias: [30, 70],
    });
    expect(g.referencias.map((r) => r.valor)).toEqual([30, 70]);
    expect(g.referencias[1].y).toBeLessThan(g.referencias[0].y);
    expect(g.linhas[0][0]).toHaveLength(4);
    expect(g.yDoValor(100)).toBeLessThan(g.yDoValor(0));
  });

  it('MACD: barras partem da linha zero, positivas para cima e negativas para baixo', () => {
    const g = criarGeometriaIndicador({
      xs,
      passo,
      altura: 100,
      series: [[null, null, 1, 2, 1]],
      barras: [null, null, 1, -2, 0.5],
    });
    const zero = g.yDoValor(0);
    expect(g.barras).toHaveLength(3);
    expect(g.barras[0].positiva).toBe(true);
    expect(g.barras[0].y + g.barras[0].altura).toBeCloseTo(zero, 6);
    expect(g.barras[1].positiva).toBe(false);
    expect(g.barras[1].y).toBeCloseTo(zero, 6);
  });

  it('sem nenhum valor usa um domínio simétrico válido', () => {
    const g = criarGeometriaIndicador({ xs, passo, altura: 100, series: [[null, null, null, null, null]] });
    expect(Number.isFinite(g.yDoValor(0))).toBe(true);
  });
});
