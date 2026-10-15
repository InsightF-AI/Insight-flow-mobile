import { Skia } from '@shopify/react-native-skia';

import type { Ponto } from '@/dominio/geometriaGrafico';

// `Skia.Path.Make()` e os `moveTo`/`lineTo`/`addRect` do SkPath estão deprecated no Skia 2.x (avisam a cada chamada);
// os caminhos saem do `PathBuilder`, que entrega o SkPath imutável com `detach()`.

/** Uma poligonal por segmento (linhas das séries e da mira). */
export function caminhoDeLinhas(segmentos: Ponto[][]) {
  const construtor = Skia.PathBuilder.Make();
  for (const segmento of segmentos) {
    segmento.forEach((ponto, i) => {
      if (i === 0) construtor.moveTo(ponto.x, ponto.y);
      else construtor.lineTo(ponto.x, ponto.y);
    });
  }
  return construtor.detach();
}

/** Todos os retângulos num único caminho (corpos dos candles, volumes, histograma do MACD). */
export function caminhoDeRetangulos(retangulos: { x: number; y: number; largura: number; altura: number }[]) {
  const construtor = Skia.PathBuilder.Make();
  for (const r of retangulos) construtor.addRect(Skia.XYWHRect(r.x, r.y, r.largura, r.altura));
  return construtor.detach();
}

/** Segmento de reta entre dois pontos (referências do RSI, linha zero do MACD, mira). */
export function reta(x1: number, y1: number, x2: number, y2: number) {
  return caminhoDeLinhas([
    [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ],
  ]);
}
