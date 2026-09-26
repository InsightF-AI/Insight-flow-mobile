import { Pressable, StyleSheet } from 'react-native';

import { Icone, type NomeIcone } from '@/components/Icone';
import { Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  rotulo: string;
  icone: NomeIcone;
  onPress: () => void;
}

export function BotaoFlutuante({ rotulo, icone, onPress }: Props) {
  const { cores, sombras } = useTema();
  return (
    <Pressable
      role="button"
      aria-label={rotulo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.botao,
        {
          backgroundColor: pressed ? cores.primariaHover : cores.primaria,
          boxShadow: `${sombras.primaria}, ${sombras.lg}`,
        },
      ]}
    >
      <Icone nome={icone} tamanho={22} cor="textoSobrePrimaria" />
      <Texto negrito cor="sobrePrimaria">
        {rotulo}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: {
    position: 'absolute',
    right: espaco.lg,
    bottom: espaco.lg,
    height: 52,
    borderRadius: 26,
    paddingHorizontal: espaco.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
  },
});
