import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Botao } from '@/components/Botao';
import { Campo } from '@/components/Campo';
import { CartaoAuth } from '@/components/CartaoAuth';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import {
  type ErrosCredenciais,
  type ErrosNovaSenha,
  extrairCodigoDeRedefinicao,
  validarRecuperacao,
  validarRedefinicao,
} from '@/dominio/credenciais';
import { useRecuperarSenha, useRedefinirSenha } from '@/hooks/useAuth';
import { espaco } from '@/theme/escala';
import { mensagemDeErro } from '@/utils/erros';

type Etapa = 'pedir' | 'redefinir' | 'pronto';

export default function RecuperarSenha() {
  const recuperar = useRecuperarSenha();
  const redefinir = useRedefinirSenha();
  const [etapa, setEtapa] = useState<Etapa>('pedir');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [errosEmail, setErrosEmail] = useState<ErrosCredenciais>({});
  const [errosSenha, setErrosSenha] = useState<ErrosNovaSenha>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  async function pedirCodigo() {
    const encontrados = validarRecuperacao({ email });
    setErrosEmail(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    setErroGeral(null);
    try {
      await recuperar.mutateAsync(email.trim());
      setEtapa('redefinir');
    } catch (erro) {
      setErroGeral(mensagemDeErro(erro));
    }
  }

  async function trocarSenha() {
    const token = extrairCodigoDeRedefinicao(codigo);
    const encontrados = validarRedefinicao({ token, novaSenha, confirmacao });
    setErrosSenha(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    setErroGeral(null);
    try {
      await redefinir.mutateAsync({ token, novaSenha });
      setEtapa('pronto');
    } catch (erro) {
      setErroGeral(mensagemDeErro(erro));
    }
  }

  const voltarAoLogin = (
    <Link href="/login" replace asChild>
      <Pressable role="link" aria-label="Voltar ao login" style={estilos.link}>
        <Texto cor="primaria" negrito>
          Voltar ao login
        </Texto>
      </Pressable>
    </Link>
  );

  if (etapa === 'pronto') {
    return (
      <Tela areaSegura centralizar>
        <CartaoAuth titulo="Senha redefinida" subtitulo="Já pode entrar com a nova senha.">
          <Botao titulo="Ir para o login" onPress={() => router.replace('/login')} />
        </CartaoAuth>
      </Tela>
    );
  }

  return (
    <Tela areaSegura centralizar>
      {etapa === 'pedir' ? (
        <CartaoAuth
          titulo="Recuperar senha"
          subtitulo="Informe o e-mail da conta. Enviaremos um link para redefinir a senha."
          rodape={voltarAoLogin}
        >
          <Campo
            rotulo="E-mail"
            valor={email}
            aoMudar={setEmail}
            erro={errosEmail.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            icone="email"
          />
          {erroGeral ? (
            <Texto role="alert" cor="negativo">
              {erroGeral}
            </Texto>
          ) : null}
          <Botao titulo="Enviar link" onPress={() => void pedirCodigo()} carregando={recuperar.isPending} />
          <Botao
            titulo="Já tenho o código"
            variante="secundario"
            onPress={() => {
              setErroGeral(null);
              setEtapa('redefinir');
            }}
          />
        </CartaoAuth>
      ) : (
        <CartaoAuth
          titulo="Nova senha"
          subtitulo="Se o e-mail estiver cadastrado, o link chegou na caixa de entrada. Cole o link inteiro (ou só o código depois de token=) e escolha a nova senha."
          rodape={voltarAoLogin}
        >
          <Campo
            rotulo="Código do e-mail"
            valor={codigo}
            aoMudar={setCodigo}
            erro={errosSenha.token}
            autoCapitalize="none"
            icone="email"
          />
          <Campo
            rotulo="Nova senha"
            valor={novaSenha}
            aoMudar={setNovaSenha}
            erro={errosSenha.novaSenha}
            secureTextEntry
            alternarSenha
            autoComplete="new-password"
            icone="cadeado"
          />
          <Campo
            rotulo="Confirmar nova senha"
            valor={confirmacao}
            aoMudar={setConfirmacao}
            erro={errosSenha.confirmacao}
            secureTextEntry
            alternarSenha
            autoComplete="new-password"
            icone="cadeado"
          />
          {erroGeral ? (
            <Texto role="alert" cor="negativo">
              {erroGeral}
            </Texto>
          ) : null}
          <Botao titulo="Redefinir senha" onPress={() => void trocarSenha()} carregando={redefinir.isPending} />
        </CartaoAuth>
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  link: { padding: espaco.sm },
});
