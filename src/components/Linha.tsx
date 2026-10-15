import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { type CorTexto, Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';

interface Props {
  rotulo: string;
  valor: ReactNode;
  cor?: CorTexto;
}

export function Linha({ rotulo, valor, cor = 'padrao' }: Props) {
  return (
    <View style={estilos.linha}>
      <Texto cor="secundario" style={estilos.rotulo}>
        {rotulo}
      </Texto>
      {typeof valor === 'string' ? (
        <Texto negrito numerico cor={cor}>
          {valor}
        </Texto>
      ) : (
        valor
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: espaco.md },
  rotulo: { flexShrink: 1 },
});
