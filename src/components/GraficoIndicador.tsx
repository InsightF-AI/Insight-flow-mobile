import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import type { AnaliseTecnica } from '@/dominio/candles';
import { criarGeometriaIndicador, type Ponto, posicoesX } from '@/dominio/geometriaGrafico';
import { useTema } from '@/theme/useTema';

interface Props {
  tipo: 'rsi' | 'macd';
  analise: AnaliseTecnica;
  indiceSelecionado: number | null;
  altura?: number;
}

function caminhoDeLinhas(segmentos: Ponto[][]) {
  const caminho = Skia.Path.Make();
  for (const segmento of segmentos) {
    segmento.forEach((ponto, i) => (i === 0 ? caminho.moveTo(ponto.x, ponto.y) : caminho.lineTo(ponto.x, ponto.y)));
  }
  return caminho;
}

function reta(x1: number, y1: number, x2: number, y2: number) {
  return caminhoDeLinhas([
    [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ],
  ]);
}

/** RSI (0–100, referências em 30 e 70) ou MACD (linha, sinal e histograma), na mesma coluna dos candles. */
export function GraficoIndicador({ tipo, analise, indiceSelecionado, altura = 110 }: Props) {
  const { grafico, cores } = useTema();
  const [largura, setLargura] = useState(0);
  const quantidade = analise.candles.length;

  const desenho = useMemo(() => {
    if (largura <= 0 || quantidade === 0) return null;
    const { xs, passo } = posicoesX(quantidade, largura);
    const geometria =
      tipo === 'rsi'
        ? criarGeometriaIndicador({ xs, passo, altura, series: [analise.rsi], dominio: [0, 100], referencias: [30, 70] })
        : criarGeometriaIndicador({
            xs,
            passo,
            altura,
            series: [analise.macd.linha, analise.macd.sinal],
            barras: analise.macd.histograma,
          });
    const barras = (positivas: boolean) => {
      const caminho = Skia.Path.Make();
      for (const barra of geometria.barras.filter((b) => b.positiva === positivas)) {
        caminho.addRect(Skia.XYWHRect(barra.x, barra.y, barra.largura, barra.altura));
      }
      return caminho;
    };
    // Cores próprias do indicador (não as das médias): a linha do MACD e a de sinal não se confundem com SMA 20/50.
    const coresDasLinhas = tipo === 'rsi' ? [cores.primaria] : [cores.primaria, cores.destaque];
    const y0 = geometria.yDoValor(0);
    return {
      xs,
      referencias: geometria.referencias.map((r) => reta(0, r.y, largura, r.y)),
      zero: reta(0, y0, largura, y0),
      barrasPositivas: barras(true),
      barrasNegativas: barras(false),
      linhas: geometria.linhas.map((segmentos, i) => ({
        caminho: caminhoDeLinhas(segmentos),
        cor: coresDasLinhas[i],
      })),
    };
  }, [analise, tipo, largura, altura, quantidade, cores]);

  const xSelecionado =
    desenho && indiceSelecionado !== null ? desenho.xs[Math.min(indiceSelecionado, quantidade - 1)] : undefined;
  const mira = useMemo(
    () => (xSelecionado === undefined ? null : reta(xSelecionado, 0, xSelecionado, altura)),
    [xSelecionado, altura],
  );

  return (
    <View
      testID={`area-${tipo}`}
      accessible
      aria-label={tipo === 'rsi' ? 'Gráfico do RSI (14), com referências em 30 e 70' : 'Gráfico do MACD (12, 26, 9)'}
      style={[estilos.area, { height: altura }]}
      onLayout={(evento: LayoutChangeEvent) => setLargura(evento.nativeEvent.layout.width)}
    >
      {desenho ? (
        <Canvas style={estilos.canvas}>
          {tipo === 'rsi'
            ? desenho.referencias.map((caminho, i) => (
                <Path key={i} path={caminho} color={grafico.eixo} style="stroke" strokeWidth={1} opacity={0.7} />
              ))
            : [
                <Path key="zero" path={desenho.zero} color={grafico.eixo} style="stroke" strokeWidth={1} opacity={0.7} />,
                <Path key="pos" path={desenho.barrasPositivas} color={grafico.alta} style="fill" opacity={0.6} />,
                <Path key="neg" path={desenho.barrasNegativas} color={grafico.baixa} style="fill" opacity={0.6} />,
              ]}
          {desenho.linhas.map(({ caminho, cor }, i) => (
            <Path key={`l${i}`} path={caminho} color={cor} style="stroke" strokeWidth={1.5} />
          ))}
          {mira ? (
            <Path path={mira} color={cores.textoSecundario} style="stroke" strokeWidth={1} opacity={0.8} />
          ) : null}
        </Canvas>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  area: { width: '100%' },
  canvas: { flex: 1 },
});
