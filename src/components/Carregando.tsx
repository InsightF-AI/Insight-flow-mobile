import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

export function Carregando({ mensagem }: { mensagem?: string }) {
  const { cores } = useTema();
  return (
    <View style={estilos.container}>
      <ActivityIndicator aria-label="Carregando" color={cores.primaria} />
      {mensagem ? <Texto cor="secundario">{mensagem}</Texto> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { padding: espaco.lg, alignItems: 'center', justifyContent: 'center', gap: espaco.sm },
});
