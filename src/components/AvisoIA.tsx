import { StyleSheet, View } from 'react-native';

import { Icone } from '@/components/Icone';
import { Texto } from '@/components/Texto';
import { AVISO_IA } from '@/dominio/regulatorio';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

export function AvisoIA() {
  const { cores } = useTema();
  return (
    <View style={[estilos.aviso, { backgroundColor: cores.superficieElevada, borderColor: cores.alerta }]}>
      <Icone nome="info" tamanho={16} cor="alerta" />
      <Texto variante="legenda" cor="secundario" style={estilos.texto}>
        {AVISO_IA}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    borderWidth: 1,
    borderRadius: raio.md,
    padding: espaco.sm,
  },
  texto: { flex: 1 },
});
