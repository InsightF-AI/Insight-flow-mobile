import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/Botao';
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

  async function aoEnviar() {
    const encontrados = validarLogin({ email, senha });
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    setErroGeral(null);
    try {
      const { access_token } = await login.mutateAsync({ email: email.trim(), senha });
      await entrar(access_token, email.trim());
    } catch (erro) {
      setErroGeral(ehStatus(erro, 401) ? 'E-mail ou senha incorretos' : mensagemDeErro(erro));
    }
  }

  return (
    <Tela areaSegura>
      <View style={estilos.cabecalho}>
        <Texto variante="destaque">InsightFlow</Texto>
        <Texto cor="secundario">Análise técnica de ativos com dados e contexto histórico.</Texto>
      </View>
      <Campo
        rotulo="E-mail"
        valor={email}
        aoMudar={setEmail}
        erro={erros.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <Campo rotulo="Senha" valor={senha} aoMudar={setSenha} erro={erros.senha} secureTextEntry autoComplete="password" />
      {erroGeral ? (
        <Texto role="alert" cor="negativo">
          {erroGeral}
        </Texto>
      ) : null}
      <Botao titulo="Entrar" onPress={aoEnviar} carregando={login.isPending} />
      <Link href="/cadastro" replace asChild>
        <Pressable role="link" style={estilos.link}>
          <Texto cor="primaria" negrito>
            Criar conta
          </Texto>
        </Pressable>
      </Link>
      <Texto variante="legenda" cor="secundario" style={estilos.rodape}>
        Ferramenta educacional de análise. Não constitui recomendação de investimento.
      </Texto>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  cabecalho: { gap: espaco.sm, marginTop: espaco.xl, marginBottom: espaco.md },
  link: { alignSelf: 'center', padding: espaco.sm },
  rodape: { textAlign: 'center', marginTop: 'auto' },
});
