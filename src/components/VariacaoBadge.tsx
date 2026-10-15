import { StyleSheet, Text, View } from 'react-native';

import type { Decimal } from '@/api/tipos';
import { espaco, fonte, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { type EscalaPercentual, formatarPercentual } from '@/utils/formatacao';

interface Props {
  valor: Decimal | number;
  escala: EscalaPercentual;
}

export function VariacaoBadge({ valor, escala }: Props) {
  const { cores } = useTema();
  const texto = formatarPercentual(valor, escala);
  const alta = texto.startsWith('+');
  const baixa = texto.startsWith('-');
  const cor = alta ? cores.positivo : baixa ? cores.negativo : cores.textoSecundario;
  const seta = alta ? '▲' : baixa ? '▼' : '•';

  return (
    <View aria-label={`Variação ${texto}`} style={[estilos.badge, { borderColor: cor }]}>
      <Text style={[estilos.texto, { color: cor }]}>{`${seta} ${texto}`}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: raio.pilula,
    paddingHorizontal: espaco.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  texto: { fontSize: fonte.legenda, fontWeight: '700' },
});
