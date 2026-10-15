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
  secundario: 'primaria',
  perigo: 'negativo',
};

export function Botao({ titulo, onPress, variante = 'primario', carregando = false, desabilitado = false }: Props) {
  const { cores } = useTema();
  const inativo = desabilitado || carregando;
  const fundo = variante === 'primario' ? cores.primaria : 'transparent';
  const borda = variante === 'perigo' ? cores.negativo : cores.primaria;

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
        { backgroundColor: fundo, borderColor: borda, opacity: inativo ? 0.6 : pressed ? 0.85 : 1 },
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={variante === 'primario' ? cores.textoSobrePrimaria : cores.primaria} />
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
    borderRadius: raio.md,
    borderWidth: 1,
    paddingHorizontal: espaco.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
});
