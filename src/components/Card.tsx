import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  titulo?: string;
  acao?: ReactNode;
  children: ReactNode;
}

export function Card({ titulo, acao, children }: Props) {
  const { cores } = useTema();
  return (
    <View style={[estilos.card, { backgroundColor: cores.superficie, borderColor: cores.borda }]}>
      {titulo || acao ? (
        <View style={estilos.cabecalho}>
          {titulo ? (
            <Texto variante="subtitulo" role="heading" style={estilos.titulo}>
              {titulo}
            </Texto>
          ) : (
            <View />
          )}
          {acao}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: raio.lg, padding: espaco.lg, gap: espaco.md },
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco.sm },
  titulo: { flexShrink: 1 },
});
