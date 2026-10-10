import { Pressable, StyleSheet, View } from 'react-native';

import { Pill } from '@/components/Pill';
import { Skeleton } from '@/components/Skeleton';
import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { formatarDataHora } from '@/utils/formatacao';

interface Props {
  ticker: string;
  regraNome: string;
  ativadoEm: string;
  /** Texto do histórico da condição (24 meses); ausente = indisponível. */
  backtest?: string;
  carregandoBacktest: boolean;
  aoPressionar: () => void;
}

/** Sinal técnico vigente de um ativo da watchlist, com o histórico da mesma condição (RN-03). */
export function ItemSinalAtivo({ ticker, regraNome, ativadoEm, backtest, carregandoBacktest, aoPressionar }: Props) {
  const { cores, sombras } = useTema();
  return (
    <Pressable
      role="button"
      aria-label={`${ticker}, ${regraNome}`}
      onPress={aoPressionar}
      style={({ pressed }) => [
        estilos.item,
        { backgroundColor: cores.superficie, borderColor: cores.borda, boxShadow: sombras.sm, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={estilos.cabecalho}>
        <Texto variante="subtitulo">{ticker}</Texto>
        <Pill tom="amarelo">{regraNome}</Pill>
      </View>
      <Texto variante="legenda" cor="secundario">
        {`Ativado em ${formatarDataHora(ativadoEm)}`}
      </Texto>
      {carregandoBacktest ? (
        <Skeleton altura={12} largura="80%" />
      ) : (
        <Texto variante="legenda" cor="secundario">
          {backtest ?? 'Histórico indisponível no momento'}
        </Texto>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  item: { gap: espaco.xs, padding: espaco.lg, borderWidth: 1, borderRadius: raio.lg },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, flexWrap: 'wrap' },
});
