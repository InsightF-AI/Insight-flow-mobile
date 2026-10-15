import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { espaco, fonte, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

type PropsRepassadas = Pick<
  TextInputProps,
  'placeholder' | 'secureTextEntry' | 'keyboardType' | 'autoCapitalize' | 'autoComplete' | 'editable'
>;

interface Props extends PropsRepassadas {
  rotulo: string;
  valor: string;
  aoMudar: (texto: string) => void;
  erro?: string;
}

export function Campo({ rotulo, valor, aoMudar, erro, ...resto }: Props) {
  const { cores } = useTema();
  return (
    <View style={estilos.container}>
      <Texto variante="legenda" cor="secundario" negrito>
        {rotulo}
      </Texto>
      <TextInput
        aria-label={rotulo}
        value={valor}
        onChangeText={aoMudar}
        placeholderTextColor={cores.textoSecundario}
        style={[
          estilos.entrada,
          { color: cores.texto, backgroundColor: cores.superficie, borderColor: erro ? cores.negativo : cores.borda },
        ]}
        {...resto}
      />
      {erro ? (
        <Texto variante="legenda" cor="negativo">
          {erro}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { gap: espaco.xs },
  entrada: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    fontSize: fonte.corpo,
  },
});
