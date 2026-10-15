import { StyleSheet, View } from 'react-native';

import { Icone, type NomeIcone } from '@/components/Icone';
import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { familia } from '@/theme/familias';
import { type Tema, useTema } from '@/theme/useTema';

export type TomPill = 'verde' | 'vermelho' | 'amarelo' | 'laranja' | 'azul' | 'violeta' | 'cinza';

function coresDoTom(tom: TomPill, { cores, tons }: Tema): { fundo: string; texto: string } {
  switch (tom) {
    case 'verde':
      return { fundo: tons.verdeFundo, texto: cores.positivo };
    case 'vermelho':
      return { fundo: tons.vermelhoFundo, texto: cores.negativo };
    case 'amarelo':
      return { fundo: tons.amareloFundo, texto: cores.alerta };
    case 'laranja':
      return { fundo: tons.laranjaFundo, texto: tons.laranjaTexto };
    case 'azul':
      return { fundo: tons.azulFundo, texto: cores.primaria };
    case 'violeta':
      return { fundo: tons.violetaFundo, texto: cores.ia };
    case 'cinza':
      return { fundo: cores.superficieAlta, texto: cores.textoSecundario };
  }
}

interface Props {
  tom?: TomPill;
  icone?: NomeIcone;
  children: string;
  'aria-label'?: string;
}

/** Rótulo em pílula colorida (padrão `Pill` do web). */
export function Pill({ tom = 'cinza', icone, children, 'aria-label': ariaLabel }: Props) {
  const tema = useTema();
  const { fundo, texto } = coresDoTom(tom, tema);
  return (
    <View aria-label={ariaLabel} style={[estilos.pill, { backgroundColor: fundo }]}>
      {icone ? <Icone nome={icone} tamanho={12} corExata={texto} /> : null}
      <Texto variante="legenda" style={{ color: texto, fontFamily: familia.medio }}>
        {children}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.xs,
    alignSelf: 'flex-start',
    borderRadius: raio.pilula,
    paddingHorizontal: espaco.sm,
    paddingVertical: 2,
  },
});
