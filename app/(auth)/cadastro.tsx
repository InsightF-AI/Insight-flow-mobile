import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Botao } from '@/components/Botao';
import { CartaoAuth } from '@/components/CartaoAuth';
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
      const tokens = await cadastro.mutateAsync({ nome: nome.trim(), email: email.trim(), senha });
      await entrar(tokens, email.trim());
    } catch (erro) {
      if (ehStatus(erro, 409)) setErros({ email: 'E-mail já cadastrado' });
      else setErroGeral(mensagemDeErro(erro));
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
        <Campo rotulo="Nome" valor={nome} aoMudar={setNome} erro={erros.nome} autoComplete="name" icone="usuario" />
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
          autoComplete="new-password"
          icone="cadeado"
          placeholder="Mínimo de 8 caracteres"
        />
        {erroGeral ? (
          <Texto role="alert" cor="negativo">
            {erroGeral}
          </Texto>
        ) : null}
        <Botao titulo="Criar conta" onPress={aoEnviar} carregando={enviando} />
      </CartaoAuth>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  link: { padding: espaco.sm },
});
