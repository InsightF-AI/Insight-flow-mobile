import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { Campo } from '@/components/Campo';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { type ErrosCredenciais, validarCadastro } from '@/dominio/credenciais';
import { useCadastro } from '@/hooks/useAuth';
import { useSessao } from '@/store/sessao';
import { espaco } from '@/theme/escala';
import { ehStatus, mensagemDeErro } from '@/utils/erros';

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

  async function aoEnviar() {
    const encontrados = validarCadastro({ nome, email, senha });
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    setErroGeral(null);
    setEnviando(true);
    try {
      const { access_token } = await cadastro.mutateAsync({ nome: nome.trim(), email: email.trim(), senha });
      await entrar(access_token, email.trim());
    } catch (erro) {
      if (ehStatus(erro, 409)) setErros({ email: 'E-mail já cadastrado' });
      else setErroGeral(mensagemDeErro(erro));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela areaSegura>
      <View style={estilos.cabecalho}>
        <Texto variante="titulo">Criar conta</Texto>
        <Texto cor="secundario">Monte sua watchlist e registre operações simuladas, sem dinheiro real.</Texto>
      </View>
      <Campo rotulo="Nome" valor={nome} aoMudar={setNome} erro={erros.nome} autoComplete="name" />
      <Campo
        rotulo="E-mail"
        valor={email}
        aoMudar={setEmail}
        erro={erros.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <Campo
        rotulo="Senha"
        valor={senha}
        aoMudar={setSenha}
        erro={erros.senha}
        secureTextEntry
        autoComplete="new-password"
        placeholder="Mínimo de 8 caracteres"
      />
      {erroGeral ? (
        <Texto role="alert" cor="negativo">
          {erroGeral}
        </Texto>
      ) : null}
      <Botao titulo="Criar conta" onPress={aoEnviar} carregando={enviando} />
      <Link href="/login" replace asChild>
        <Pressable role="link" style={estilos.link}>
          <Texto cor="primaria" negrito>
            Já tenho conta
          </Texto>
        </Pressable>
      </Link>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  cabecalho: { gap: espaco.sm, marginTop: espaco.xl, marginBottom: espaco.md },
  link: { alignSelf: 'center', padding: espaco.sm },
});
