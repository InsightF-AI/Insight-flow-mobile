import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, type TextInput } from 'react-native';

import { Botao } from '@/components/Botao';
import { CartaoAuth } from '@/components/CartaoAuth';
import { Campo } from '@/components/Campo';
import { MensagemErro } from '@/components/MensagemErro';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { type ErrosCredenciais, validarLogin } from '@/dominio/credenciais';
import { useLogin } from '@/hooks/useAuth';
import { useSessao } from '@/store/sessao';
import { espaco } from '@/theme/escala';
import { ehStatus, mensagemDeErro } from '@/utils/erros';
import { focarPrimeiroComErro } from '@/utils/formulario';

export default function Login() {
  const entrar = useSessao((estado) => estado.entrar);
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<ErrosCredenciais>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  // `isPending` da mutation volta a false antes de `entrar` terminar de gravar no armazenamento seguro.
  const [enviando, setEnviando] = useState(false);
  const campoEmail = useRef<TextInput>(null);
  const campoSenha = useRef<TextInput>(null);

  async function aoEnviar() {
    if (enviando) return;
    const encontrados = validarLogin({ email, senha });
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) {
      focarPrimeiroComErro(encontrados, [
        ['email', campoEmail],
        ['senha', campoSenha],
      ]);
      return;
    }
    setErroGeral(null);
    setEnviando(true);
    try {
      const tokens = await login.mutateAsync({ email: email.trim(), senha });
      await entrar(tokens, email.trim());
    } catch (erro) {
      setErroGeral(ehStatus(erro, 401) ? 'E-mail ou senha incorretos' : mensagemDeErro(erro));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela areaSegura centralizar>
      <CartaoAuth
        titulo="Entrar"
        subtitulo="Acesse sua conta para ver sua watchlist e sua carteira simulada."
        rodape={
          <Link href="/cadastro" replace asChild>
            <Pressable role="link" aria-label="Criar conta" style={estilos.link}>
              <Texto cor="secundario">
                Não tem conta?{' '}
                <Texto cor="primaria" negrito>
                  Criar conta
                </Texto>
              </Texto>
            </Pressable>
          </Link>
        }
      >
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
          autoComplete="password"
          icone="cadeado"
          returnKeyType="go"
          onSubmitEditing={() => void aoEnviar()}
        />
        <MensagemErro mensagem={erroGeral} />
        <Botao titulo="Entrar" onPress={aoEnviar} carregando={enviando} />
        <Link href="/recuperar-senha" asChild>
          <Pressable role="link" aria-label="Esqueci minha senha" style={estilos.link}>
            <Texto cor="primaria" style={estilos.centro}>
              Esqueci minha senha
            </Texto>
          </Pressable>
        </Link>
      </CartaoAuth>
      <Texto variante="legenda" cor="terciario" style={estilos.rodape}>
        Ferramenta educacional de análise. Não constitui recomendação de investimento.
      </Texto>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  link: { padding: espaco.sm },
  centro: { textAlign: 'center' },
  rodape: { textAlign: 'center' },
});
