import { Pressable, StyleSheet } from 'react-native';

import { Icone, type NomeIcone } from '@/components/Icone';

interface Props {
  icone: NomeIcone;
  rotulo: string;
  onPress: () => void;
}

export function BotaoCabecalho({ icone, rotulo, onPress }: Props) {
  return (
    <Pressable role="button" aria-label={rotulo} onPress={onPress} style={estilos.botao}>
      <Icone nome={icone} tamanho={22} cor="primaria" />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
