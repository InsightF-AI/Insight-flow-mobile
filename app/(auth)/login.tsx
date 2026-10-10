import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Botao } from '@/components/Botao';
import { CartaoAuth } from '@/components/CartaoAuth';
import { Campo } from '@/components/Campo';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { type ErrosCredenciais, validarLogin } from '@/dominio/credenciais';
import { useLogin } from '@/hooks/useAuth';
import { useSessao } from '@/store/sessao';
import { espaco } from '@/theme/escala';
import { ehStatus, mensagemDeErro } from '@/utils/erros';

export default function Login() {
  const entrar = useSessao((estado) => estado.entrar);
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<ErrosCredenciais>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  // `isPending` da mutation volta a false antes de `entrar` terminar de gravar no armazenamento seguro.
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar() {
    const encontrados = validarLogin({ email, senha });
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
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
          rotulo="E-mail"
          valor={email}
          aoMudar={setEmail}
          erro={erros.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          icone="email"
        />
        <Campo
          rotulo="Senha"
          valor={senha}
          aoMudar={setSenha}
          erro={erros.senha}
          secureTextEntry
          alternarSenha
          autoComplete="password"
          icone="cadeado"
        />
        {erroGeral ? (
          <Texto role="alert" cor="negativo">
            {erroGeral}
          </Texto>
        ) : null}
        <Botao titulo="Entrar" onPress={aoEnviar} carregando={enviando} />
      </CartaoAuth>
      <Texto variante="legenda" cor="terciario" style={estilos.rodape}>
        Ferramenta educacional de análise. Não constitui recomendação de investimento.
      </Texto>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  link: { padding: espaco.sm },
  rodape: { textAlign: 'center' },
});
