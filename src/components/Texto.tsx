import { Text, type TextProps, type TextStyle } from 'react-native';

import type { Cores } from '@/theme/cores';
import { fonte } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

export type VarianteTexto = 'destaque' | 'titulo' | 'subtitulo' | 'corpo' | 'legenda';
export type CorTexto = 'padrao' | 'secundario' | 'primaria' | 'positivo' | 'negativo' | 'alerta' | 'sobrePrimaria';

const TOKEN_DA_COR: Record<CorTexto, keyof Cores> = {
  padrao: 'texto',
  secundario: 'textoSecundario',
  primaria: 'primaria',
  positivo: 'positivo',
  negativo: 'negativo',
  alerta: 'alerta',
  sobrePrimaria: 'textoSobrePrimaria',
};

const ESTILO_DA_VARIANTE: Record<VarianteTexto, TextStyle> = {
  destaque: { fontSize: fonte.destaque, fontWeight: '700' },
  titulo: { fontSize: fonte.titulo, fontWeight: '700' },
  subtitulo: { fontSize: fonte.subtitulo, fontWeight: '600' },
  corpo: { fontSize: fonte.corpo },
  legenda: { fontSize: fonte.legenda },
};

const NEGRITO: TextStyle = { fontWeight: '700' };

interface Props extends TextProps {
  variante?: VarianteTexto;
  cor?: CorTexto;
  negrito?: boolean;
}

export function Texto({ variante = 'corpo', cor = 'padrao', negrito = false, style, ...resto }: Props) {
  const { cores } = useTema();
  return (
    <Text
      style={[ESTILO_DA_VARIANTE[variante], { color: cores[TOKEN_DA_COR[cor]] }, negrito && NEGRITO, style]}
      {...resto}
    />
  );
}
