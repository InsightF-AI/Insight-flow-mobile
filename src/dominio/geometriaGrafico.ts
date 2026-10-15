import type { Candle } from '@/dominio/candles';
import type { Serie } from '@/dominio/series';

export interface Ponto {
  x: number;
  y: number;
}

const MARGEM_HORIZONTAL = 4;
const FRACAO_PRECO = 0.78;
const FRACAO_ESPACO = 0.04;
const FOLGA_PRECO = 0.05;
const MARGEM_VERTICAL_INDICADOR = 4;

/** Mesmo mapeamento horizontal para candles, RSI e MACD: a mira cai na mesma coluna nos três. */
export function posicoesX(quantidade: number, largura: number): { xs: number[]; passo: number } {
  const util = Math.max(largura - 2 * MARGEM_HORIZONTAL, 1);
  const passo = quantidade > 0 ? util / quantidade : util;
  const xs = Array.from({ length: quantidade }, (_, i) => MARGEM_HORIZONTAL + (i + 0.5) * passo);
  return { xs, passo };
}

export function indiceDoX(x: number, quantidade: number, largura: number): number {
  if (quantidade <= 0) return 0;
  const { passo } = posicoesX(quantidade, largura);
  const indice = Math.round((x - MARGEM_HORIZONTAL) / passo - 0.5);
  return Math.min(Math.max(indice, 0), quantidade - 1);
}

export function segmentosDaSerie(
  serie: Serie,
  xs: readonly number[],
  yDoValor: (valor: number) => number,
): Ponto[][] {
  const segmentos: Ponto[][] = [];
  let atual: Ponto[] = [];
  serie.forEach((valor, i) => {
    if (valor === null || !Number.isFinite(valor) || i >= xs.length) {
      if (atual.length > 0) segmentos.push(atual);
      atual = [];
      return;
    }
    atual.push({ x: xs[i], y: yDoValor(valor) });
  });
  if (atual.length > 0) segmentos.push(atual);
  return segmentos;
}

export interface Corpo {
  x: number;
  y: number;
  largura: number;
  altura: number;
  alta: boolean;
}

export interface Pavio {
  x: number;
  y1: number;
  y2: number;
  alta: boolean;
}

export interface BarraVolume {
  x: number;
  y: number;
  largura: number;
  altura: number;
  alta: boolean;
}

export interface GeometriaCandles {
  xs: number[];
  passo: number;
  yPreco: (preco: number) => number;
  corpos: Corpo[];
  pavios: Pavio[];
  volumes: BarraVolume[];
}

/** Painel de preço no alto (78%) e de volume embaixo, em coordenadas de uma área `largura` × `altura`. */
export function criarGeometriaCandles(
  candles: readonly Candle[],
  largura: number,
  altura: number,
  extras: readonly number[] = [],
): GeometriaCandles {
  const { xs, passo } = posicoesX(candles.length, largura);
  const alturaPreco = altura * FRACAO_PRECO;
  const topoVolume = altura * (FRACAO_PRECO + FRACAO_ESPACO);
  const alturaVolume = altura - topoVolume;

  let minimo = Infinity;
  let maximo = -Infinity;
  for (const candle of candles) {
    minimo = Math.min(minimo, candle.minima);
    maximo = Math.max(maximo, candle.maxima);
  }
  for (const extra of extras) {
    if (!Number.isFinite(extra)) continue;
    minimo = Math.min(minimo, extra);
    maximo = Math.max(maximo, extra);
  }
  if (!Number.isFinite(minimo) || !Number.isFinite(maximo)) {
    minimo = 0;
    maximo = 1;
  }
  if (maximo === minimo) {
    minimo -= 1;
    maximo += 1;
  }
  const folga = (maximo - minimo) * FOLGA_PRECO;
  const topo = maximo + folga;
  const base = minimo - folga;
  const yPreco = (preco: number) => alturaPreco * (1 - (preco - base) / (topo - base));

  const larguraCorpo = Math.max(Math.min(passo * 0.7, 14), 1);
  const volumeMaximo = candles.reduce((maior, candle) => Math.max(maior, candle.volume), 0);

  return {
    xs,
    passo,
    yPreco,
    corpos: candles.map((candle, i) => {
      const yAbertura = yPreco(candle.abertura);
      const yFechamento = yPreco(candle.fechamento);
      return {
        x: xs[i] - larguraCorpo / 2,
        y: Math.min(yAbertura, yFechamento),
        largura: larguraCorpo,
        altura: Math.max(Math.abs(yAbertura - yFechamento), 1),
        alta: candle.fechamento >= candle.abertura,
      };
    }),
    pavios: candles.map((candle, i) => ({
      x: xs[i],
      y1: yPreco(candle.maxima),
      y2: yPreco(candle.minima),
      alta: candle.fechamento >= candle.abertura,
    })),
    volumes: candles.map((candle, i) => {
      const alturaBarra = volumeMaximo > 0 ? (candle.volume / volumeMaximo) * alturaVolume : 0;
      return {
        x: xs[i] - larguraCorpo / 2,
        y: altura - alturaBarra,
        largura: larguraCorpo,
        altura: alturaBarra,
        alta: candle.fechamento >= candle.abertura,
      };
    }),
  };
}

export interface BarraIndicador {
  x: number;
  y: number;
  largura: number;
  altura: number;
  positiva: boolean;
}

export interface GeometriaIndicador {
  yDoValor: (valor: number) => number;
  linhas: Ponto[][][];
  barras: BarraIndicador[];
  referencias: { valor: number; y: number }[];
}

export function criarGeometriaIndicador(args: {
  xs: readonly number[];
  passo: number;
  altura: number;
  series: readonly Serie[];
  barras?: Serie;
  dominio?: readonly [number, number];
  referencias?: readonly number[];
}): GeometriaIndicador {
  const { xs, passo, altura, series, barras = [], referencias = [] } = args;

  let minimo: number;
  let maximo: number;
  if (args.dominio) {
    [minimo, maximo] = args.dominio;
  } else {
    const valores = [...series.flat(), ...barras].filter((v): v is number => v !== null && Number.isFinite(v));
    const magnitude = valores.reduce((maior, valor) => Math.max(maior, Math.abs(valor)), 0) || 1;
    minimo = -magnitude;
    maximo = magnitude;
  }
  const util = Math.max(altura - 2 * MARGEM_VERTICAL_INDICADOR, 1);
  const yDoValor = (valor: number) => MARGEM_VERTICAL_INDICADOR + util * (1 - (valor - minimo) / (maximo - minimo));

  const larguraBarra = Math.max(Math.min(passo * 0.7, 10), 1);
  const y0 = yDoValor(0);

  return {
    yDoValor,
    linhas: series.map((serie) => segmentosDaSerie(serie, xs, yDoValor)),
    barras: barras.flatMap((valor, i) => {
      if (valor === null || !Number.isFinite(valor) || i >= xs.length) return [];
      const y = yDoValor(valor);
      return [
        {
          x: xs[i] - larguraBarra / 2,
          y: Math.min(y, y0),
          largura: larguraBarra,
          altura: Math.abs(y - y0),
          positiva: valor >= 0,
        },
      ];
    }),
    referencias: referencias.map((valor) => ({ valor, y: yDoValor(valor) })),
  };
}
