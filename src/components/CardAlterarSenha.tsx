import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';

import { Botao } from '@/components/Botao';
import { Campo } from '@/components/Campo';
import { Card } from '@/components/Card';
import { MensagemErro } from '@/components/MensagemErro';
import { Texto } from '@/components/Texto';
import { type ErrosNovaSenha, validarAlteracaoDeSenha } from '@/dominio/credenciais';
import { mensagemDeErro } from '@/utils/erros';
import { focarPrimeiroComErro } from '@/utils/formulario';

interface Props {
  /** Resolve quando o servidor aceitou a troca; rejeita com o erro da API. */
  aoAlterar: (senhaAtual: string, novaSenha: string) => Promise<void>;
}

/** Troca de senha dentro do Perfil. Fechado por padrão: o formulário só aparece quando o usuário pede. */
export function CardAlterarSenha({ aoAlterar }: Props) {
  const [aberto, setAberto] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<ErrosNovaSenha>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const campoAtual = useRef<TextInput>(null);
  const campoNova = useRef<TextInput>(null);
  const campoConfirmacao = useRef<TextInput>(null);

  function fechar() {
    setAberto(false);
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmacao('');
    setErros({});
    setErroGeral(null);
  }

  async function enviar() {
    if (enviando) return;
    const encontrados = validarAlteracaoDeSenha({ senhaAtual, novaSenha, confirmacao });
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) {
      focarPrimeiroComErro(encontrados, [
        ['senhaAtual', campoAtual],
        ['novaSenha', campoNova],
        ['confirmacao', campoConfirmacao],
      ]);
      return;
    }
    setErroGeral(null);
    setEnviando(true);
    try {
      await aoAlterar(senhaAtual, novaSenha);
    } catch (erro) {
      setErroGeral(mensagemDeErro(erro));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card titulo="Segurança" icone="cadeado">
      {aberto ? (
        <>
          <Campo
            ref={campoAtual}
            rotulo="Senha atual"
            valor={senhaAtual}
            aoMudar={setSenhaAtual}
            erro={erros.senhaAtual}
            secureTextEntry
            alternarSenha
            autoComplete="current-password"
            icone="cadeado"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => campoNova.current?.focus()}
          />
          <Campo
            ref={campoNova}
            rotulo="Nova senha"
            valor={novaSenha}
            aoMudar={setNovaSenha}
            erro={erros.novaSenha}
            secureTextEntry
            alternarSenha
            autoComplete="new-password"
            icone="cadeado"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => campoConfirmacao.current?.focus()}
          />
          <Campo
            ref={campoConfirmacao}
            rotulo="Confirmar nova senha"
            valor={confirmacao}
            aoMudar={setConfirmacao}
            erro={erros.confirmacao}
            secureTextEntry
            alternarSenha
            autoComplete="new-password"
            icone="cadeado"
            returnKeyType="done"
            onSubmitEditing={() => void enviar()}
          />
          <Texto variante="legenda" cor="secundario">
            Ao trocar a senha, todos os aparelhos saem da conta e você entra de novo.
          </Texto>
          <MensagemErro mensagem={erroGeral} />
          <Botao titulo="Salvar nova senha" onPress={() => void enviar()} carregando={enviando} />
          <Botao titulo="Cancelar" variante="secundario" onPress={fechar} />
        </>
      ) : (
        <Botao titulo="Alterar senha" variante="secundario" onPress={() => setAberto(true)} />
      )}
    </Card>
  );
}
