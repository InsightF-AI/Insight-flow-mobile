import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlternadorFiltro } from '@/components/AlternadorFiltro';
import { GraficoCandles } from '@/components/GraficoCandles';
import { GraficoIndicador } from '@/components/GraficoIndicador';
import { Texto } from '@/components/Texto';
import { type AnaliseTecnica, SOBREPOSICOES_PADRAO, type Sobreposicoes } from '@/dominio/candles';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { formatarData, formatarMoeda, formatarNumero, formatarVolume } from '@/utils/formatacao';

interface Props {
  analise: AnaliseTecnica;
  moeda?: string;
  /** Médias e Bollinger escolhidos antes (a tela os guarda: trocar de período remonta o painel). */
  sobreposicoesIniciais?: Sobreposicoes;
  aoMudarSobreposicoes?: (sobreposicoes: Sobreposicoes) => void;
}

function numero(valor: number | null | undefined, casas = 2): string {
  return valor === null || valor === undefined ? '—' : formatarNumero(valor, casas);
}

function temValor(serie: readonly (number | null)[]): boolean {
  return serie.some((valor) => valor !== null);
}

/** Por que RSI e/ou MACD não aparecem: falta do histórico anterior ao período ou histórico curto demais. */
function motivoSemIndicadores(semRsi: boolean, semMacd: boolean, calculados: boolean): string | null {
  if (!semRsi && !semMacd) return null;
  if (!calculados) return 'RSI e MACD precisam do histórico anterior ao período, que não está disponível agora.';
  const nomes = [semRsi ? 'o RSI (14)' : null, semMacd ? 'o MACD (12, 26, 9)' : null].filter(Boolean);
  return `Histórico curto demais para calcular ${nomes.join(' e ')}.`;
}

/** Candles, RSI e MACD com uma mira única: tocar num candle mostra os valores de todos os indicadores naquele dia. */
export function PainelTecnico({ analise, moeda, sobreposicoesIniciais, aoMudarSobreposicoes }: Props) {
  const { grafico } = useTema();
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [sobreposicoes, setSobreposicoes] = useState<Sobreposicoes>(sobreposicoesIniciais ?? SOBREPOSICOES_PADRAO);

  const total = analise.candles.length;
  if (total === 0) return null;
  const indice = Math.min(selecionado ?? total - 1, total - 1);
  const candle = analise.candles[indice];
  const alternar = (chave: keyof Sobreposicoes) => {
    const proximas = { ...sobreposicoes, [chave]: !sobreposicoes[chave] };
    setSobreposicoes(proximas);
    aoMudarSobreposicoes?.(proximas);
  };
  const temRsi = temValor(analise.rsi);
  const temMacd = temValor(analise.macd.linha);
  const motivo = motivoSemIndicadores(!temRsi, !temMacd, analise.rsiMacdCalculados);

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
          {`Volume ${formatarVolume(candle.volume)}`}
        </Texto>
      </View>

      <GraficoCandles
        analise={analise}
        sobreposicoes={sobreposicoes}
        indiceSelecionado={selecionado}
        aoSelecionar={setSelecionado}
      />

      {temRsi ? (
        <>
          <Texto variante="legenda" cor="secundario" numerico>
            {`RSI (14): ${numero(analise.rsi[indice], 1)}`}
          </Texto>
          <GraficoIndicador tipo="rsi" analise={analise} indiceSelecionado={selecionado} />
        </>
      ) : null}

      {temMacd ? (
        <>
          <Texto variante="legenda" cor="secundario" numerico>
            {`MACD: ${numero(analise.macd.linha[indice])} · Sinal: ${numero(analise.macd.sinal[indice])} · Histograma: ${numero(
              analise.macd.histograma[indice],
            )}`}
          </Texto>
          <GraficoIndicador tipo="macd" analise={analise} indiceSelecionado={selecionado} />
        </>
      ) : null}

      {motivo ? (
        <Texto variante="legenda" cor="secundario">
          {motivo}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  painel: { gap: espaco.md },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  leitura: { gap: 2 },
});
