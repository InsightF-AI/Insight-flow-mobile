import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvisoIA } from '@/components/AvisoIA';
import { Botao } from '@/components/Botao';
import { Texto } from '@/components/Texto';
import { espaco, fonte, raio } from '@/theme/escala';
import { familia } from '@/theme/familias';
import { useTema } from '@/theme/useTema';

// O backend ainda não expõe o chat (RF-15); a tela já nasce com o aviso legal fixo (RN-05).
export default function Chat() {
  const { cores, sombras } = useTema();
  const insets = useSafeAreaInsets();
  return (
    <View style={[estilos.tela, { backgroundColor: cores.fundo }]}>
      <ScrollView contentContainerStyle={estilos.conversa}>
        <View style={[
            estilos.balao,
            { backgroundColor: cores.superficie, borderColor: cores.borda, boxShadow: sombras.sm },
          ]}>
          <Texto negrito>Assistente InsightFlow</Texto>
          <Texto>O chat com IA estará disponível em breve.</Texto>
          <Texto cor="secundario">
            Você poderá fazer perguntas como “qual ativo da carteira teve o melhor desempenho no mês?”, com respostas
            baseadas nos dados reais da sua carteira simulada.
          </Texto>
        </View>
      </ScrollView>
      <View
        style={[
          estilos.rodape,
          { borderColor: cores.borda, backgroundColor: cores.superficie, paddingBottom: espaco.md + insets.bottom },
        ]}
      >
        <AvisoIA />
        <View style={estilos.entrada}>
          <TextInput
            aria-label="Mensagem para a IA"
            editable={false}
            placeholder="Disponível em breve"
            placeholderTextColor={cores.textoTerciario}
            style={[
              estilos.campo,
              { color: cores.texto, borderColor: cores.bordaForte, backgroundColor: cores.superficieElevada },
            ]}
          />
          <Botao titulo="Enviar" onPress={() => undefined} desabilitado />
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conversa: { padding: espaco.lg, gap: espaco.md },
  balao: { borderWidth: 1, borderRadius: raio.lg, padding: espaco.lg, gap: espaco.sm, maxWidth: '90%' },
  rodape: { borderTopWidth: StyleSheet.hairlineWidth, padding: espaco.md, gap: espaco.sm },
  entrada: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  campo: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: raio.sm,
    paddingHorizontal: espaco.md,
    fontSize: fonte.corpo,
    fontFamily: familia.corpo,
  },
});
