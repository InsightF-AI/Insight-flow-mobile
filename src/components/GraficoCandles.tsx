import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import type { AnaliseTecnica } from '@/dominio/candles';
import { criarGeometriaCandles, indiceDoX, type Ponto, segmentosDaSerie } from '@/dominio/geometriaGrafico';
import type { Serie } from '@/dominio/series';
import { useTema } from '@/theme/useTema';
import { formatarData } from '@/utils/formatacao';

export type Sobreposicoes = { sma20: boolean; sma50: boolean; sma200: boolean; bollinger: boolean };

interface Props {
  analise: AnaliseTecnica;
  sobreposicoes: Sobreposicoes;
  indiceSelecionado: number | null;
  aoSelecionar: (indice: number) => void;
  altura?: number;
}

function caminhoDeLinhas(segmentos: Ponto[][]) {
  const caminho = Skia.Path.Make();
  for (const segmento of segmentos) {
    segmento.forEach((ponto, i) => (i === 0 ? caminho.moveTo(ponto.x, ponto.y) : caminho.lineTo(ponto.x, ponto.y)));
  }
  return caminho;
}

function caminhoDeRetangulos(retangulos: { x: number; y: number; largura: number; altura: number }[]) {
  const caminho = Skia.Path.Make();
  for (const r of retangulos) caminho.addRect(Skia.XYWHRect(r.x, r.y, r.largura, r.altura));
  return caminho;
}

function valoresFinitos(serie: Serie): number[] {
  return serie.filter((valor): valor is number => valor !== null && Number.isFinite(valor));
}

/** Candles + volume + médias/Bollinger. O gráfico só desenha o que `criarGeometriaCandles` calcula. */
export function GraficoCandles({ analise, sobreposicoes, indiceSelecionado, aoSelecionar, altura = 260 }: Props) {
  const { grafico, cores } = useTema();
  const [largura, setLargura] = useState(0);
  const { candles } = analise;

  const linhasVisiveis = useMemo(() => {
    const lista: { serie: Serie; cor: string }[] = [];
    if (sobreposicoes.sma20) lista.push({ serie: analise.sma20, cor: grafico.sma20 });
    if (sobreposicoes.sma50) lista.push({ serie: analise.sma50, cor: grafico.sma50 });
    if (sobreposicoes.sma200) lista.push({ serie: analise.sma200, cor: grafico.sma200 });
    if (sobreposicoes.bollinger) {
      lista.push({ serie: analise.bollinger.superior, cor: grafico.eixo });
      lista.push({ serie: analise.bollinger.media, cor: grafico.eixo });
      lista.push({ serie: analise.bollinger.inferior, cor: grafico.eixo });
    }
    return lista;
  }, [analise, sobreposicoes, grafico]);

  const desenho = useMemo(() => {
    if (largura <= 0 || candles.length === 0) return null;
    const extras = linhasVisiveis.flatMap(({ serie }) => valoresFinitos(serie));
    const geometria = criarGeometriaCandles(candles, largura, altura, extras);
    const pavio = (p: { x: number; y1: number; y2: number }): Ponto[] => [
      { x: p.x, y: p.y1 },
      { x: p.x, y: p.y2 },
    ];
    return {
      xs: geometria.xs,
      corposAlta: caminhoDeRetangulos(geometria.corpos.filter((c) => c.alta)),
      corposBaixa: caminhoDeRetangulos(geometria.corpos.filter((c) => !c.alta)),
      paviosAlta: caminhoDeLinhas(geometria.pavios.filter((p) => p.alta).map(pavio)),
      paviosBaixa: caminhoDeLinhas(geometria.pavios.filter((p) => !p.alta).map(pavio)),
      volumesAlta: caminhoDeRetangulos(geometria.volumes.filter((v) => v.alta)),
      volumesBaixa: caminhoDeRetangulos(geometria.volumes.filter((v) => !v.alta)),
      linhas: linhasVisiveis.map(({ serie, cor }) => ({
        cor,
        caminho: caminhoDeLinhas(segmentosDaSerie(serie, geometria.xs, geometria.yPreco)),
      })),
    };
  }, [candles, largura, altura, linhasVisiveis]);

  const quantidade = candles.length;
  const gesto = useMemo(() => {
    const selecionar = (x: number) => {
      if (largura > 0 && quantidade > 0) aoSelecionar(indiceDoX(x, quantidade, largura));
    };
    // Arrasto horizontal escolhe o candle; deslocamento vertical passa para a rolagem da tela.
    const arrasto = Gesture.Pan()
      .withTestId('candles-arrasto')
      .runOnJS(true)
      .activeOffsetX([-8, 8])
      .failOffsetY([-12, 12])
      .onUpdate((evento) => selecionar(evento.x));
    const toque = Gesture.Tap()
      .withTestId('candles-toque')
      .runOnJS(true)
      .onEnd((evento) => selecionar(evento.x));
    return Gesture.Race(arrasto, toque);
  }, [largura, quantidade, aoSelecionar]);

  const xSelecionado =
    desenho && indiceSelecionado !== null ? desenho.xs[Math.min(indiceSelecionado, quantidade - 1)] : undefined;
  const mira = useMemo(
    () =>
      xSelecionado === undefined
        ? null
        : caminhoDeLinhas([
            [
              { x: xSelecionado, y: 0 },
              { x: xSelecionado, y: altura },
            ],
          ]),
    [xSelecionado, altura],
  );

  if (quantidade === 0) return null;

  const descricao = `Gráfico de candles de ${formatarData(candles[0].data)} a ${formatarData(
    candles[quantidade - 1].data,
  )}, ${quantidade} candles. Toque ou arraste para ver os valores de cada dia.`;

  return (
    <GestureDetector gesture={gesto}>
      <View
        testID="area-candles"
        accessible
        aria-label={descricao}
        style={[estilos.area, { height: altura }]}
        onLayout={(evento: LayoutChangeEvent) => setLargura(evento.nativeEvent.layout.width)}
      >
        {desenho ? (
          <Canvas style={estilos.canvas}>
            <Path path={desenho.volumesAlta} color={grafico.alta} opacity={0.3} style="fill" />
            <Path path={desenho.volumesBaixa} color={grafico.baixa} opacity={0.3} style="fill" />
            {desenho.linhas.map(({ caminho, cor }, i) => (
              <Path key={i} path={caminho} color={cor} style="stroke" strokeWidth={1.5} />
            ))}
            <Path path={desenho.paviosAlta} color={grafico.alta} style="stroke" strokeWidth={1} />
            <Path path={desenho.paviosBaixa} color={grafico.baixa} style="stroke" strokeWidth={1} />
            <Path path={desenho.corposAlta} color={grafico.alta} style="fill" />
            <Path path={desenho.corposBaixa} color={grafico.baixa} style="fill" />
            {mira ? (
              <Path path={mira} color={cores.textoSecundario} style="stroke" strokeWidth={1} opacity={0.8} />
            ) : null}
          </Canvas>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const estilos = StyleSheet.create({
  area: { width: '100%' },
  canvas: { flex: 1 },
});
