import { StyleSheet, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { Icone } from '@/components/Icone';
import { Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';

interface Props {
  mensagem: string;
  acao?: { titulo: string; onPress: () => void };
}

export function EstadoVazio({ mensagem, acao }: Props) {
  return (
    <View style={estilos.container}>
      <Icone nome="caixa-vazia" tamanho={22} cor="textoTerciario" />
      <Texto cor="terciario" style={estilos.texto}>
        {mensagem}
      </Texto>
      {acao ? <Botao titulo={acao.titulo} variante="secundario" onPress={acao.onPress} /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { padding: espaco.lg, gap: espaco.md, alignItems: 'center' },
  texto: { textAlign: 'center' },
});
