import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { AtivoEncontrado } from '@/api/tipos';
import { Texto } from '@/components/Texto';
import { ROTULO_TIPO_ATIVO } from '@/dominio/rotulos';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  ativo: AtivoEncontrado;
  aoPressionar: () => void;
}

export function LinhaResultadoBusca({ ativo, aoPressionar }: Props) {
  const { cores } = useTema();
  return (
    <Pressable
      role="button"
      aria-label={`${ativo.ticker}, ${ativo.nome}`}
      onPress={aoPressionar}
      style={({ pressed }) => [estilos.linha, { borderColor: cores.borda, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={estilos.textos}>
        <Texto negrito>{ativo.ticker}</Texto>
        <Texto numberOfLines={1}>{ativo.nome}</Texto>
        <Texto variante="legenda" cor="secundario">{`${ROTULO_TIPO_ATIVO[ativo.tipo]} · ${ativo.moeda}`}</Texto>
      </View>
      <Ionicons name="add-circle-outline" size={24} color={cores.primaria} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingVertical: espaco.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textos: { flex: 1, gap: 2 },
});
