import { type DimensionValue, StyleSheet, View } from 'react-native';

import { raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  largura?: DimensionValue;
  altura?: number;
}

/** Espaço reservado enquanto o dado carrega (estático: sem timers de animação nos testes). */
export function Skeleton({ largura = '100%', altura = 16 }: Props) {
  const { cores } = useTema();
  return (
    <View
      accessible
      aria-label="Carregando"
      style={[estilos.bloco, { width: largura, height: altura, backgroundColor: cores.superficieAlta }]}
    />
  );
}

const estilos = StyleSheet.create({
  bloco: { borderRadius: raio.sm },
});
