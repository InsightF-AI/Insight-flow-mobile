import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import type { IndicadorDescrito } from '@/dominio/indicadores';
import { espaco } from '@/theme/escala';

export function IndicadorItem({ indicador }: { indicador: IndicadorDescrito }) {
  return (
    <View style={estilos.linha}>
      <View style={estilos.textos}>
        <Texto negrito>{indicador.titulo}</Texto>
        <Texto variante="legenda" cor="secundario">
          {indicador.descricao}
        </Texto>
      </View>
      <Texto negrito>{indicador.valor}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco.md },
  textos: { flex: 1, gap: 2 },
});
