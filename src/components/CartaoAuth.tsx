import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

// O alias `@/` aponta para `src/`, então o asset entra por caminho relativo. Se o lint reclamar de `require`,
// use `import LOGO from '../../assets/icone.png';` (os tipos do Expo declaram módulos de imagem).
const LOGO = require('../../assets/icone.png');

interface Props {
  titulo: string;
  subtitulo: string;
  children: ReactNode;
  rodape?: ReactNode;
}

/** Card de login/cadastro do web: barra de gradiente azul→verde, logo, marca e título da tela. */
export function CartaoAuth({ titulo, subtitulo, children, rodape }: Props) {
  const { cores, sombras } = useTema();
  return (
    <View
      style={[
        estilos.cartao,
        { backgroundColor: cores.superficie, borderColor: cores.bordaForte, boxShadow: `${sombras.lg}, ${sombras.brilho}` },
      ]}
    >
      <LinearGradient
        colors={[cores.primaria, cores.positivo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={estilos.barra}
      />
      <Image source={LOGO} style={estilos.logo} aria-hidden accessibilityIgnoresInvertColors />
      <Texto variante="titulo" style={estilos.centro}>
        InsightFlow
      </Texto>
      <Texto variante="rotulo" cor="terciario" style={[estilos.centro, estilos.linhaDaMarca]}>
        Análise de ativos · B3 & Cripto
      </Texto>
      <View style={estilos.cabecalho}>
        <Texto variante="titulo" role="heading">
          {titulo}
        </Texto>
        <Texto cor="secundario">{subtitulo}</Texto>
      </View>
      <View style={estilos.conteudo}>{children}</View>
      {rodape ? <View style={estilos.rodape}>{rodape}</View> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: raio.xl,
    padding: espaco.xl,
    gap: espaco.sm,
    overflow: 'hidden',
  },
  barra: { position: 'absolute', top: 0, left: '18%', right: '18%', height: 2, borderRadius: 2 },
  logo: { width: 64, height: 64, alignSelf: 'center' },
  centro: { textAlign: 'center' },
  linhaDaMarca: { fontSize: 10, letterSpacing: 2 },
  cabecalho: { gap: espaco.xs, marginTop: espaco.lg },
  conteudo: { gap: espaco.md, marginTop: espaco.md },
  rodape: { alignItems: 'center', marginTop: espaco.md },
});
