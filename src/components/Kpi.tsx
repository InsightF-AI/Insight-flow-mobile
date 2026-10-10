import { StyleSheet, View } from 'react-native';

import type { NomeIcone } from '@/components/Icone';
import { IconeChip, type TomChip } from '@/components/IconeChip';
import { Skeleton } from '@/components/Skeleton';
import { type CorTexto, Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  rotulo: string;
  valor: string;
  icone: NomeIcone;
  tomIcone?: TomChip;
  corValor?: CorTexto;
  dica?: string;
  carregando?: boolean;
}

/** Métrica com rótulo, valor e dica (padrão `Kpi` do web). */
export function Kpi({ rotulo, valor, icone, tomIcone = 'primaria', corValor = 'padrao', dica, carregando = false }: Props) {
  const { cores, sombras } = useTema();
  return (
    <View
      style={[
        estilos.kpi,
        { backgroundColor: cores.superficie, borderColor: cores.borda, boxShadow: `${sombras.md}, ${sombras.brilho}` },
      ]}
    >
      <View style={estilos.topo}>
        <Texto variante="rotulo" cor="terciario" style={estilos.rotulo}>
          {rotulo}
        </Texto>
        <IconeChip nome={icone} tom={tomIcone} tamanho={28} />
      </View>
      {carregando ? (
        <>
          <Skeleton altura={24} largura="70%" />
          <Skeleton altura={12} largura="50%" />
        </>
      ) : (
        <>
          <Texto variante="titulo" numerico cor={corValor} numberOfLines={1} adjustsFontSizeToFit>
            {valor}
          </Texto>
          {dica ? (
            <Texto variante="legenda" cor="secundario" numberOfLines={2}>
              {dica}
            </Texto>
          ) : null}
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  kpi: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: espaco.sm,
    padding: espaco.md,
    borderWidth: 1,
    borderRadius: raio.lg,
  },
  topo: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: espaco.sm },
  rotulo: { flexShrink: 1 },
});
