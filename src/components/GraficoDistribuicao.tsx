import { StyleSheet, View } from 'react-native';
import { Pie, PolarChart } from 'victory-native';

import { Texto } from '@/components/Texto';
import type { FatiaDistribuicao } from '@/dominio/portfolio';
import { espaco } from '@/theme/escala';
import { formatarNumero } from '@/utils/formatacao';

export function GraficoDistribuicao({ fatias }: { fatias: FatiaDistribuicao[] }) {
  return (
    <View style={estilos.container}>
      <View style={estilos.rosca}>
        <PolarChart data={fatias} labelKey="rotulo" valueKey="valor" colorKey="cor">
          <Pie.Chart innerRadius="58%" />
        </PolarChart>
      </View>
      <View style={estilos.legenda}>
        {fatias.map((fatia) => (
          <View key={fatia.rotulo} style={estilos.itemLegenda}>
            <View style={[estilos.marcador, { backgroundColor: fatia.cor }]} />
            <Texto style={estilos.rotulo} numberOfLines={1}>
              {fatia.rotulo}
            </Texto>
            <Texto negrito numerico>{`${formatarNumero(fatia.valor * 100, 1)}%`}</Texto>
          </View>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: espaco.lg },
  rosca: { width: 140, height: 140 },
  legenda: { flex: 1, gap: espaco.sm },
  itemLegenda: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  marcador: { width: 10, height: 10, borderRadius: 5 },
  rotulo: { flex: 1 },
});
