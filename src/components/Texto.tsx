import { Text, type TextProps, type TextStyle } from 'react-native';

import type { Cores } from '@/theme/cores';
import { fonte } from '@/theme/escala';
import { familia } from '@/theme/familias';
import { useTema } from '@/theme/useTema';

export type VarianteTexto = 'destaque' | 'titulo' | 'subtitulo' | 'secao' | 'corpo' | 'legenda' | 'rotulo';
export type CorTexto =
  | 'padrao'
  | 'secundario'
  | 'terciario'
  | 'primaria'
  | 'destaque'
  | 'ia'
  | 'positivo'
  | 'negativo'
  | 'alerta'
  | 'sobrePrimaria';

const TOKEN_DA_COR: Record<CorTexto, keyof Cores> = {
  padrao: 'texto',
  secundario: 'textoSecundario',
  terciario: 'textoTerciario',
  primaria: 'primaria',
  destaque: 'destaque',
  ia: 'ia',
  positivo: 'positivo',
  negativo: 'negativo',
  alerta: 'alerta',
  sobrePrimaria: 'textoSobrePrimaria',
};

const ESTILO_DA_VARIANTE: Record<VarianteTexto, TextStyle> = {
  destaque: { fontSize: fonte.destaque, fontFamily: familia.titulo },
  titulo: { fontSize: fonte.titulo, fontFamily: familia.titulo },
  subtitulo: { fontSize: fonte.subtitulo, fontFamily: familia.tituloSemi },
  secao: { fontSize: fonte.secao, fontFamily: familia.semibold },
  corpo: { fontSize: fonte.corpo, fontFamily: familia.corpo },
  legenda: { fontSize: fonte.legenda, fontFamily: familia.corpo },
  // Rótulo de campo/KPI, como `.label` do web: caixa alta, letras espaçadas.
  rotulo: { fontSize: fonte.legenda, fontFamily: familia.semibold, textTransform: 'uppercase', letterSpacing: 0.8 },
};

// Peso "negrito" por variante: com fonte customizada o peso vem da família, nunca de `fontWeight`.
const FAMILIA_NEGRITO: Partial<Record<VarianteTexto, string>> = {
  subtitulo: familia.titulo,
  secao: familia.negrito,
  corpo: familia.negrito,
  legenda: familia.negrito,
  rotulo: familia.negrito,
};

const NUMERICO: TextStyle = { fontVariant: ['tabular-nums'] };

interface Props extends TextProps {
  variante?: VarianteTexto;
  cor?: CorTexto;
  negrito?: boolean;
  /** Algarismos de largura fixa (preços, percentuais, quantidades). */
  numerico?: boolean;
}

export function Texto({ variante = 'corpo', cor = 'padrao', negrito = false, numerico = false, style, ...resto }: Props) {
  const { cores } = useTema();
  const familiaNegrito = negrito ? FAMILIA_NEGRITO[variante] : undefined;
  return (
    <Text
      style={[
        ESTILO_DA_VARIANTE[variante],
        familiaNegrito ? { fontFamily: familiaNegrito } : null,
        numerico ? NUMERICO : null,
        { color: cores[TOKEN_DA_COR[cor]] },
        style,
      ]}
      {...resto}
    />
  );
}
