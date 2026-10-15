import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import type { NomeIcone } from '@/components/BotaoCabecalho';
import { Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  rotulo: string;
  icone: NomeIcone;
  onPress: () => void;
}

export function BotaoFlutuante({ rotulo, icone, onPress }: Props) {
  const { cores } = useTema();
  return (
    <Pressable
      role="button"
      aria-label={rotulo}
      onPress={onPress}
      style={({ pressed }) => [estilos.botao, { backgroundColor: cores.primaria, opacity: pressed ? 0.85 : 1 }]}
    >
      <Ionicons name={icone} size={22} color={cores.textoSobrePrimaria} />
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
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
