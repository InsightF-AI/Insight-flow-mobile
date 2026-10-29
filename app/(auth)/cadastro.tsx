import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, type TextInput } from 'react-native';

import { Botao } from '@/components/Botao';
import { CartaoAuth } from '@/components/CartaoAuth';
import { Campo } from '@/components/Campo';
import { MensagemErro } from '@/components/MensagemErro';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { type ErrosCredenciais, validarCadastro } from '@/dominio/credenciais';
import { useCadastro } from '@/hooks/useAuth';
import { useSessao } from '@/store/sessao';
import { espaco } from '@/theme/escala';
import { ehStatus, mensagemDeErro } from '@/utils/erros';
import { focarPrimeiroComErro } from '@/utils/formulario';

export default function Cadastro() {
  const entrar = useSessao((estado) => estado.entrar);
  const cadastro = useCadastro();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<ErrosCredenciais>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  // `isPending` da mutation volta a false antes de `entrar` terminar de gravar no armazenamento seguro.
  const [enviando, setEnviando] = useState(false);
  const campoNome = useRef<TextInput>(null);
  const campoEmail = useRef<TextInput>(null);
  const campoSenha = useRef<TextInput>(null);

  async function aoEnviar() {
    if (enviando) return;
    const encontrados = validarCadastro({ nome, email, senha });
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) {
      focarPrimeiroComErro(encontrados, [
        ['nome', campoNome],
        ['email', campoEmail],
        ['senha', campoSenha],
      ]);
      return;
    }
    setErroGeral(null);
    setEnviando(true);
    try {
      const tokens = await cadastro.mutateAsync({ nome: nome.trim(), email: email.trim(), senha });
      await entrar(tokens, email.trim());
    } catch (erro) {
      if (ehStatus(erro, 409)) {
        setErros({ email: 'E-mail já cadastrado' });
        campoEmail.current?.focus();
      } else setErroGeral(mensagemDeErro(erro));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela areaSegura centralizar>
      <CartaoAuth
        titulo="Criar conta"
        subtitulo="Monte sua watchlist e registre operações simuladas, sem dinheiro real."
        rodape={
          <Link href="/login" replace asChild>
            <Pressable role="link" aria-label="Já tem conta? Entrar" style={estilos.link}>
              <Texto cor="secundario">
                Já tem conta?{' '}
                <Texto cor="primaria" negrito>
                  Entrar
                </Texto>
              </Texto>
            </Pressable>
          </Link>
        }
      >
        <Campo
          ref={campoNome}
          rotulo="Nome"
          valor={nome}
          aoMudar={setNome}
          erro={erros.nome}
          autoComplete="name"
          autoCapitalize="words"
          icone="usuario"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => campoEmail.current?.focus()}
        />
        <Campo
          ref={campoEmail}
          rotulo="E-mail"
          valor={email}
          aoMudar={setEmail}
          erro={erros.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          icone="email"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => campoSenha.current?.focus()}
        />
        <Campo
          ref={campoSenha}
          rotulo="Senha"
          valor={senha}
          aoMudar={setSenha}
          erro={erros.senha}
          secureTextEntry
          alternarSenha
          autoComplete="new-password"
          icone="cadeado"
          placeholder="Mínimo de 8 caracteres"
          returnKeyType="go"
          onSubmitEditing={() => void aoEnviar()}
        />
        <MensagemErro mensagem={erroGeral} />
        <Botao titulo="Criar conta" onPress={aoEnviar} carregando={enviando} />
      </CartaoAuth>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  link: { padding: espaco.sm },
});
