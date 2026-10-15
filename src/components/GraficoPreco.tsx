import { StyleSheet, View } from 'react-native';
import { Area, CartesianChart, Line } from 'victory-native';

import { Texto } from '@/components/Texto';
import { VariacaoBadge } from '@/components/VariacaoBadge';
import type { SeriePreco } from '@/dominio/graficos';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { formatarData, formatarMoeda } from '@/utils/formatacao';

interface Props {
  serie: SeriePreco;
  moeda?: string;
}

// Sem eixos desenhados no Skia (evita embarcar fonte TTF); mínimo, máximo e datas ficam em Text.
export function GraficoPreco({ serie, moeda }: Props) {
  const { cores } = useTema();
  return (
    <View style={estilos.container}>
      <View
        style={estilos.grafico}
        aria-label={`Gráfico de fechamento de ${formatarData(serie.inicio)} a ${formatarData(serie.fim)}`}
      >
        <CartesianChart data={serie.pontos} xKey="indice" yKeys={['fechamento']} domainPadding={{ top: 16, bottom: 16 }}>
          {({ points, chartBounds }) => (
            <>
              <Area points={points.fechamento} y0={chartBounds.bottom} color={cores.primaria} opacity={0.15} />
              <Line points={points.fechamento} color={cores.primaria} strokeWidth={2} />
            </>
          )}
        </CartesianChart>
      </View>
      <View style={estilos.legenda}>
        <Texto variante="legenda" cor="secundario">{`Mín. ${formatarMoeda(serie.minimo, moeda)}`}</Texto>
        <Texto variante="legenda" cor="secundario">{`Máx. ${formatarMoeda(serie.maximo, moeda)}`}</Texto>
      </View>
      <View style={estilos.legenda}>
        <Texto variante="legenda" cor="secundario">
          {formatarData(serie.inicio)}
        </Texto>
        <VariacaoBadge valor={serie.variacaoPercentual} escala="pontos" />
        <Texto variante="legenda" cor="secundario">
          {formatarData(serie.fim)}
        </Texto>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { gap: espaco.sm },
  grafico: { height: 200 },
  legenda: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
