import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

export type NomeIcone = ComponentProps<typeof Ionicons>['name'];

interface Props {
  icone: NomeIcone;
  rotulo: string;
  onPress: () => void;
}

export function BotaoCabecalho({ icone, rotulo, onPress }: Props) {
  const { cores } = useTema();
  return (
    <Pressable role="button" aria-label={rotulo} hitSlop={8} onPress={onPress} style={estilos.botao}>
      <Ionicons name={icone} size={24} color={cores.primaria} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: { paddingHorizontal: espaco.md },
});
