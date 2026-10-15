import { StyleSheet, View } from 'react-native';

import { Icone } from '@/components/Icone';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';

interface Props {
  mensagem: string;
}

/** Mostrada no lugar do app quando EXPO_PUBLIC_API_URL é inválida: sem ela não há como falar com o backend. */
export function ConfiguracaoInvalida({ mensagem }: Props) {
  return (
    <Tela areaSegura centralizar>
      <View style={estilos.conteudo}>
        <Icone nome="erro" tamanho={28} cor="negativo" />
        <Texto variante="titulo" role="heading" style={estilos.centro}>
          Endereço do servidor inválido
        </Texto>
        <Texto role="alert" style={estilos.centro}>
          {mensagem}
        </Texto>
        <Texto cor="secundario" style={estilos.centro}>
          Corrija o arquivo .env do app e reinicie o Metro com &quot;npx expo start -c&quot;.
        </Texto>
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: espaco.md, alignItems: 'center', padding: espaco.lg },
  centro: { textAlign: 'center' },
});
