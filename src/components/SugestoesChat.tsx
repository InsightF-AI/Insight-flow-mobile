import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  sugestoes: readonly string[];
  aoEscolher: (sugestao: string) => void;
  desabilitado?: boolean;
}

export function SugestoesChat({ sugestoes, aoEscolher, desabilitado = false }: Props) {
  const { cores } = useTema();
  return (
    <View style={estilos.grade}>
      {sugestoes.map((sugestao) => (
        <Pressable
          key={sugestao}
          role="button"
          aria-label={sugestao}
          aria-disabled={desabilitado}
          disabled={desabilitado}
          onPress={() => aoEscolher(sugestao)}
          style={[
            estilos.chip,
            { borderColor: cores.bordaForte, backgroundColor: cores.superficieElevada, opacity: desabilitado ? 0.5 : 1 },
          ]}
        >
          <Texto variante="legenda" cor="secundario">
            {sugestao}
          </Texto>
        </Pressable>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: raio.lg,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.xs,
  },
});
