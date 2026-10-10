import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  rotulo: string;
  ativo: boolean;
  /** Cor da linha que o interruptor liga no gráfico (legenda). */
  cor: string;
  aoAlternar: () => void;
}

export function AlternadorFiltro({ rotulo, ativo, cor, aoAlternar }: Props) {
  const { cores } = useTema();
  return (
    <Pressable
      role="switch"
      aria-label={rotulo}
      aria-checked={ativo}
      onPress={aoAlternar}
      style={[
        estilos.chip,
        { borderColor: ativo ? cor : cores.bordaForte, backgroundColor: ativo ? cores.superficieAlta : 'transparent' },
      ]}
    >
      <View style={[estilos.marcador, { backgroundColor: cor, opacity: ativo ? 1 : 0.4 }]} />
      <Texto variante="legenda" negrito={ativo} cor={ativo ? 'padrao' : 'secundario'}>
        {rotulo}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    borderWidth: 1,
    borderRadius: raio.pilula,
    paddingHorizontal: espaco.md,
  },
  marcador: { width: 14, height: 3, borderRadius: 2 },
});
