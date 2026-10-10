import { StyleSheet, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { Icone } from '@/components/Icone';
import { Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';
import { codigoDoErro, mensagemDeErro } from '@/utils/erros';

interface Props {
  erro: unknown;
  aoTentarNovamente: () => void;
  mensagem?: string;
}

export function ErroComRetry({ erro, aoTentarNovamente, mensagem }: Props) {
  const codigo = codigoDoErro(erro);
  return (
    <View style={estilos.container}>
      <Icone nome="erro" tamanho={22} cor="negativo" />
      <Texto role="alert" cor="negativo" style={estilos.texto}>
        {mensagem ?? mensagemDeErro(erro)}
      </Texto>
      {codigo ? (
        <Texto variante="legenda" cor="terciario" selectable style={estilos.texto}>
          {`Código do erro: ${codigo}`}
        </Texto>
      ) : null}
      <Botao titulo="Tentar novamente" variante="secundario" onPress={aoTentarNovamente} />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { padding: espaco.lg, gap: espaco.md, alignItems: 'center' },
  texto: { textAlign: 'center' },
});
