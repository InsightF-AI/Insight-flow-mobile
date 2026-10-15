import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { type CorTexto, Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

type VarianteBotao = 'primario' | 'secundario' | 'perigo';

interface Props {
  titulo: string;
  onPress: () => void;
  variante?: VarianteBotao;
  carregando?: boolean;
  desabilitado?: boolean;
}

const COR_DO_TEXTO: Record<VarianteBotao, CorTexto> = {
  primario: 'sobrePrimaria',
  secundario: 'secundario',
  perigo: 'negativo',
};

export function Botao({ titulo, onPress, variante = 'primario', carregando = false, desabilitado = false }: Props) {
  const { cores, sombras } = useTema();
  const inativo = desabilitado || carregando;
  const primario = variante === 'primario';
  const borda = variante === 'perigo' ? cores.negativo : primario ? cores.primaria : cores.bordaForte;
  const sombra = primario ? `${sombras.primaria}, ${sombras.brilho}` : sombras.sm;

  return (
    <Pressable
      role="button"
      aria-label={titulo}
      aria-disabled={inativo}
      aria-busy={carregando}
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        {
          backgroundColor: primario ? (pressed ? cores.primariaHover : cores.primaria) : 'transparent',
          borderColor: borda,
          boxShadow: sombra,
          opacity: inativo ? 0.5 : 1,
          transform: [{ scale: pressed && !inativo ? 0.98 : 1 }],
        },
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={primario ? cores.textoSobrePrimaria : cores.primaria} />
      ) : (
        <Texto negrito cor={COR_DO_TEXTO[variante]}>
          {titulo}
        </Texto>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: raio.sm,
    borderWidth: 1,
    paddingHorizontal: espaco.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
});
