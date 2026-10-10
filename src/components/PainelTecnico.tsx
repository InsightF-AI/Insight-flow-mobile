import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlternadorFiltro } from '@/components/AlternadorFiltro';
import { GraficoCandles, type Sobreposicoes } from '@/components/GraficoCandles';
import { GraficoIndicador } from '@/components/GraficoIndicador';
import { Texto } from '@/components/Texto';
import type { AnaliseTecnica } from '@/dominio/candles';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { formatarData, formatarMoeda, formatarNumero } from '@/utils/formatacao';

interface Props {
  analise: AnaliseTecnica;
  moeda?: string;
}

function numero(valor: number | null | undefined, casas = 2): string {
  return valor === null || valor === undefined ? '—' : formatarNumero(valor, casas);
}

/** Candles, RSI e MACD com uma mira única: tocar num candle mostra os valores de todos os indicadores naquele dia. */
export function PainelTecnico({ analise, moeda }: Props) {
  const { grafico } = useTema();
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [sobreposicoes, setSobreposicoes] = useState<Sobreposicoes>({
    sma20: true,
    sma50: true,
    sma200: false,
    bollinger: false,
  });

  const total = analise.candles.length;
  if (total === 0) return null;
  const indice = Math.min(selecionado ?? total - 1, total - 1);
  const candle = analise.candles[indice];
  const alternar = (chave: keyof Sobreposicoes) => setSobreposicoes((atual) => ({ ...atual, [chave]: !atual[chave] }));

  return (
    <View style={estilos.painel}>
      <View style={estilos.filtros}>
        <AlternadorFiltro
          rotulo="SMA 20"
          ativo={sobreposicoes.sma20}
          cor={grafico.sma20}
          aoAlternar={() => alternar('sma20')}
        />
        <AlternadorFiltro
          rotulo="SMA 50"
          ativo={sobreposicoes.sma50}
          cor={grafico.sma50}
          aoAlternar={() => alternar('sma50')}
        />
        <AlternadorFiltro
          rotulo="SMA 200"
          ativo={sobreposicoes.sma200}
          cor={grafico.sma200}
          aoAlternar={() => alternar('sma200')}
        />
        <AlternadorFiltro
          rotulo="Bollinger"
          ativo={sobreposicoes.bollinger}
          cor={grafico.eixo}
          aoAlternar={() => alternar('bollinger')}
        />
      </View>

      <View style={estilos.leitura} accessibilityLiveRegion="polite">
        <Texto negrito>{formatarData(candle.data)}</Texto>
        <Texto variante="legenda" cor="secundario" numerico>
          {`Abertura ${formatarMoeda(candle.abertura, moeda)}`}
        </Texto>
        <Texto variante="legenda" cor="secundario" numerico>
          {`Máxima ${formatarMoeda(candle.maxima, moeda)}`}
        </Texto>
        <Texto variante="legenda" cor="secundario" numerico>
          {`Mínima ${formatarMoeda(candle.minima, moeda)}`}
        </Texto>
        <Texto variante="legenda" cor="secundario" numerico>
          {`Fechamento ${formatarMoeda(candle.fechamento, moeda)}`}
        </Texto>
        <Texto variante="legenda" cor="secundario" numerico>
          {`Volume ${formatarNumero(candle.volume, 0)}`}
        </Texto>
      </View>

      <GraficoCandles
        analise={analise}
        sobreposicoes={sobreposicoes}
        indiceSelecionado={selecionado}
        aoSelecionar={setSelecionado}
      />

      <Texto variante="legenda" cor="secundario" numerico>
        {`RSI (14): ${numero(analise.rsi[indice], 1)}`}
      </Texto>
      <GraficoIndicador tipo="rsi" analise={analise} indiceSelecionado={selecionado} />

      <Texto variante="legenda" cor="secundario" numerico>
        {`MACD: ${numero(analise.macd.linha[indice])} · Sinal: ${numero(analise.macd.sinal[indice])} · Histograma: ${numero(
          analise.macd.histograma[indice],
        )}`}
      </Texto>
      <GraficoIndicador tipo="macd" analise={analise} indiceSelecionado={selecionado} />
    </View>
  );
}

const estilos = StyleSheet.create({
  painel: { gap: espaco.md },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  leitura: { gap: 2 },
});
