import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { NomeIcone } from '@/components/Icone';
import { IconeChip, type TomChip } from '@/components/IconeChip';
import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  titulo?: string;
  acao?: ReactNode;
  /** Chip de ícone antes do título (padrão `SectionTitle` do web). */
  icone?: NomeIcone;
  tomIcone?: TomChip;
  children: ReactNode;
}

export function Card({ titulo, acao, icone, tomIcone = 'primaria', children }: Props) {
  const { cores, sombras } = useTema();
  const temCabecalho = Boolean(titulo || acao);
  return (
    <View
      style={[
        estilos.card,
        { backgroundColor: cores.superficie, borderColor: cores.borda, boxShadow: `${sombras.md}, ${sombras.brilho}` },
      ]}
    >
      {temCabecalho ? (
        <View style={[estilos.cabecalho, { backgroundColor: cores.superficieElevada, borderBottomColor: cores.borda }]}>
          <View style={estilos.tituloLinha}>
            {icone ? <IconeChip nome={icone} tom={tomIcone} tamanho={24} /> : null}
            {titulo ? (
              <Texto variante="secao" role="heading" style={estilos.titulo}>
                {titulo}
              </Texto>
            ) : null}
          </View>
          {acao}
        </View>
      ) : null}
      <View style={estilos.corpo}>{children}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: raio.lg, overflow: 'hidden' },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaco.sm,
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.md,
    borderBottomWidth: 1,
  },
  tituloLinha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, flexShrink: 1 },
  titulo: { flexShrink: 1 },
  corpo: { padding: espaco.lg, gap: espaco.md },
});
