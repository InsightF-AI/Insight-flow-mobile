import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { Ativo, CotacaoAtual } from '@/api/tipos';
import { Texto } from '@/components/Texto';
import { VariacaoBadge } from '@/components/VariacaoBadge';
import { ROTULO_TIPO_ATIVO } from '@/dominio/rotulos';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { formatarMoeda } from '@/utils/formatacao';

export type EstadoCotacao = 'carregando' | 'ok' | 'indisponivel';

interface Props {
  ativo: Ativo;
  cotacao?: CotacaoAtual;
  estadoCotacao: EstadoCotacao;
  aoPressionar: () => void;
}

export function LinhaAtivo({ ativo, cotacao, estadoCotacao, aoPressionar }: Props) {
  const { cores, sombras } = useTema();
  return (
    <Pressable
      role="button"
      aria-label={`${ativo.ticker}, ${ativo.nome}`}
      onPress={aoPressionar}
      style={({ pressed }) => [
        estilos.linha,
        { backgroundColor: cores.superficie, borderColor: cores.borda, boxShadow: sombras.sm, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={estilos.esquerda}>
        <Texto variante="subtitulo">{ativo.ticker}</Texto>
        <Texto variante="legenda" cor="secundario" numberOfLines={1}>
          {`${ROTULO_TIPO_ATIVO[ativo.tipo]} · ${ativo.nome}`}
        </Texto>
      </View>
      <View style={estilos.direita}>
        {estadoCotacao === 'carregando' ? <ActivityIndicator color={cores.primaria} /> : null}
        {estadoCotacao === 'indisponivel' ? (
          <>
            <Texto negrito>—</Texto>
            <Texto variante="legenda" cor="secundario">
              sem cotação
            </Texto>
          </>
        ) : null}
        {estadoCotacao === 'ok' && cotacao ? (
          <>
            <Texto negrito numerico>{formatarMoeda(cotacao.preco, ativo.moeda)}</Texto>
            <VariacaoBadge valor={cotacao.variacao_percentual} escala="pontos" />
          </>
        ) : null}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    padding: espaco.lg,
    borderWidth: 1,
    borderRadius: raio.lg,
  },
  esquerda: { flex: 1, gap: 2 },
  direita: { alignItems: 'flex-end', gap: espaco.xs },
});
