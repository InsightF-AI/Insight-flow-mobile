import { StyleSheet, View } from 'react-native';

import { Icone, type NomeIcone } from '@/components/Icone';
import { raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

export type TomChip = 'primaria' | 'positivo' | 'negativo' | 'destaque' | 'ia' | 'neutro';

interface Props {
  nome: NomeIcone;
  tom?: TomChip;
  tamanho?: number;
}

/** Ícone em quadrado colorido (padrão `IconChip` do web) — cabeçalhos de seção e KPIs. */
export function IconeChip({ nome, tom = 'primaria', tamanho = 28 }: Props) {
  const { cores, sombras } = useTema();
  const fundo = tom === 'neutro' ? cores.superficieAlta : cores[tom];
  const corIcone = tom === 'neutro' ? 'texto' : 'textoSobrePrimaria';
  return (
    <View
      style={[estilos.chip, { width: tamanho, height: tamanho, backgroundColor: fundo, boxShadow: sombras.sm }]}
    >
      <Icone nome={nome} tamanho={Math.round(tamanho * 0.55)} cor={corIcone} />
    </View>
  );
}

const estilos = StyleSheet.create({
  chip: { borderRadius: raio.sm, alignItems: 'center', justifyContent: 'center' },
});
