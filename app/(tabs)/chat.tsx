import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AvisoIA } from '@/components/AvisoIA';
import { BalaoMensagem } from '@/components/BalaoMensagem';
import { Botao } from '@/components/Botao';
import { ErroComRetry } from '@/components/ErroComRetry';
import { Icone } from '@/components/Icone';
import { SugestoesChat } from '@/components/SugestoesChat';
import { Texto } from '@/components/Texto';
import {
  MAXIMO_DE_CARACTERES,
  type MensagemLocal,
  SUGESTOES_DO_CHAT,
  textoParaCopiar,
  validarPergunta,
} from '@/dominio/ia';
import { useConversa } from '@/store/conversa';
import { espaco, fonte, raio } from '@/theme/escala';
import { familia } from '@/theme/familias';
import { useTema } from '@/theme/useTema';
import { mensagemDeErroDaIA } from '@/utils/erros';

const BOAS_VINDAS =
  'Posso responder sobre a sua carteira simulada consultando os dados registrados: rentabilidade, exposição por classe e setor, comparativo com CDI e Ibovespa, histórico de operações e sinais ativos.';
const TEMPO_DO_COPIADO_MS = 1500;

export default function Chat() {
  const { cores } = useTema();
  const mensagens = useConversa((estado) => estado.mensagens);
  const enviando = useConversa((estado) => estado.enviando);
  const erro = useConversa((estado) => estado.erro);
  const enviar = useConversa((estado) => estado.enviar);
  const tentarNovamente = useConversa((estado) => estado.tentarNovamente);
  const limpar = useConversa((estado) => estado.limpar);

  const [rascunho, setRascunho] = useState('');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const rolagem = useRef<ScrollView>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  const validacao = validarPergunta(rascunho);
  const caracteres = rascunho.trim().length;
  const excedeu = caracteres > MAXIMO_DE_CARACTERES;
  const podeEnviar = validacao.valida && !enviando;
  const falhaPendente = Boolean(mensagens[mensagens.length - 1]?.falhou) && !enviando;

  function enviarRascunho() {
    if (!podeEnviar) return;
    const pergunta = rascunho;
    setRascunho('');
    void enviar(pergunta);
  }

  async function copiar(mensagem: MensagemLocal) {
    try {
      await Clipboard.setStringAsync(textoParaCopiar(mensagem));
    } catch {
      Alert.alert('Não foi possível copiar', 'Selecione o texto da resposta e copie manualmente.');
      return;
    }
    setCopiadoId(mensagem.id);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setCopiadoId(null), TEMPO_DO_COPIADO_MS);
  }

  function confirmarLimpeza() {
    Alert.alert('Limpar conversa', 'Apagar as mensagens desta conversa?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpar', style: 'destructive', onPress: limpar },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={[estilos.tela, { backgroundColor: cores.fundo }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={rolagem}
        contentContainerStyle={estilos.conversa}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => rolagem.current?.scrollToEnd({ animated: true })}
      >
        {mensagens.length > 0 ? (
          <Pressable role="button" aria-label="Limpar conversa" onPress={confirmarLimpeza} style={estilos.limpar}>
            <Icone nome="lixeira" tamanho={16} cor="textoSecundario" />
            <Texto variante="legenda" cor="secundario">
              Limpar conversa
            </Texto>
          </Pressable>
        ) : null}

        <BalaoMensagem papel="assistente" texto={BOAS_VINDAS} />

        {mensagens.length === 0 ? (
          <SugestoesChat sugestoes={SUGESTOES_DO_CHAT} aoEscolher={(sugestao) => void enviar(sugestao)} desabilitado={enviando} />
        ) : null}

        {mensagens.map((mensagem) => (
          <BalaoMensagem
            key={mensagem.id}
            papel={mensagem.papel}
            texto={mensagem.texto}
            falhou={mensagem.falhou}
            aoCopiar={mensagem.papel === 'assistente' ? () => void copiar(mensagem) : undefined}
            copiado={copiadoId === mensagem.id}
          />
        ))}

        {enviando ? (
          <BalaoMensagem papel="assistente" texto="Consultando os dados da carteira… pode levar até 1 minuto." pendente />
        ) : null}

        {falhaPendente ? (
          <ErroComRetry
            erro={erro}
            mensagem={mensagemDeErroDaIA(erro, 'chat')}
            aoTentarNovamente={() => void tentarNovamente()}
          />
        ) : null}
      </ScrollView>

      <View style={[estilos.rodape, { borderColor: cores.borda, backgroundColor: cores.superficie }]}>
        <AvisoIA />
        <View style={estilos.entrada}>
          <TextInput
            aria-label="Mensagem para a IA"
            multiline
            value={rascunho}
            onChangeText={setRascunho}
            placeholder="Pergunte sobre a sua carteira…"
            placeholderTextColor={cores.textoTerciario}
            style={[
              estilos.campo,
              {
                color: cores.texto,
                borderColor: excedeu ? cores.negativo : cores.bordaForte,
                backgroundColor: cores.superficieElevada,
              },
            ]}
          />
          <Botao titulo="Enviar" onPress={enviarRascunho} desabilitado={!podeEnviar} />
        </View>
        {excedeu && !validacao.valida ? (
          <Texto variante="legenda" cor="negativo">
            {validacao.motivo}
          </Texto>
        ) : (
          <Texto variante="legenda" cor="terciario">{`${caracteres}/${MAXIMO_DE_CARACTERES}`}</Texto>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conversa: { padding: espaco.lg, gap: espaco.md, flexGrow: 1 },
  limpar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: espaco.xs, alignSelf: 'flex-end' },
  rodape: { borderTopWidth: StyleSheet.hairlineWidth, padding: espaco.md, gap: espaco.sm },
  entrada: { flexDirection: 'row', alignItems: 'flex-end', gap: espaco.sm },
  campo: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: raio.sm,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    fontSize: fonte.corpo,
    fontFamily: familia.corpo,
  },
});
