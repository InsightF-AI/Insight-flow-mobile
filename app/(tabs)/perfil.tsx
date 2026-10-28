import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking } from 'react-native';

import { type ResultadoDaConexao, testarConexao } from '@/api/saude';
import { Botao } from '@/components/Botao';
import { Card } from '@/components/Card';
import { CardAlterarSenha } from '@/components/CardAlterarSenha';
import { CardNotificarPorAtivo } from '@/components/CardNotificarPorAtivo';
import { CardPush } from '@/components/CardPush';
import { CardServidor } from '@/components/CardServidor';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { urlDoServidor } from '@/config/ambiente';
import { useAlterarSenha } from '@/hooks/useAuth';
import { useNaoLidas } from '@/hooks/useNotificacoes';
import { useDefinirNotificacao, useWatchlist } from '@/hooks/useWatchlist';
import { type EsquemaTema, usePreferencias } from '@/store/preferencias';
import { usePush } from '@/store/push';
import { useSessao } from '@/store/sessao';
import { mensagemDeErro } from '@/utils/erros';

const TEMAS: readonly { valor: EsquemaTema; rotulo: string }[] = [
  { valor: 'escuro', rotulo: 'Escuro' },
  { valor: 'claro', rotulo: 'Claro' },
];

/** O servidor pode estar fora do ar: sair não espera mais que isto pelo `DELETE /dispositivos`. */
const LIMITE_DO_DESREGISTRO_MS = 4_000;

async function desregistrarPushSemTravar(): Promise<void> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<void>((resolver) => {
    temporizador = setTimeout(resolver, LIMITE_DO_DESREGISTRO_MS);
  });
  try {
    await Promise.race([usePush.getState().desregistrar(), limite]);
  } finally {
    clearTimeout(temporizador);
  }
}

export default function Perfil() {
  const tema = usePreferencias((estado) => estado.tema);
  const definirTema = usePreferencias((estado) => estado.definirTema);
  const pushLigado = usePreferencias((estado) => estado.pushLigado);
  const email = useSessao((estado) => estado.email);
  const sair = useSessao((estado) => estado.sair);
  const naoLidas = useNaoLidas();
  const alterarSenha = useAlterarSenha();

  const situacaoDoPush = usePush((estado) => estado.situacao);
  const motivoDoPush = usePush((estado) => estado.motivo);
  const erroDoPush = usePush((estado) => estado.erro);
  const ligarPush = usePush((estado) => estado.ligar);
  const desligarPush = usePush((estado) => estado.desligar);
  const sincronizarPush = usePush((estado) => estado.sincronizar);

  const watchlist = useWatchlist();
  const definirNotificacao = useDefinirNotificacao();

  const [resultadoDaConexao, setResultadoDaConexao] = useState<ResultadoDaConexao>();
  const [testando, setTestando] = useState(false);

  // Só vale como "ligado" quando o aparelho consegue: negado, indisponível e desligado mostram o interruptor apagado.
  const pushEfetivo = pushLigado && (situacaoDoPush === 'ligado' || situacaoDoPush === 'verificando' || situacaoDoPush === 'erro');

  async function testar() {
    setTestando(true);
    try {
      setResultadoDaConexao(await testarConexao(urlDoServidor()));
    } finally {
      setTestando(false);
    }
  }

  /** O servidor revoga todos os refresh tokens ao trocar a senha: este aparelho sai e entra de novo com a nova. */
  async function trocarSenha(senhaAtual: string, novaSenha: string) {
    await alterarSenha.mutateAsync({ senhaAtual, novaSenha });
    await desregistrarPushSemTravar();
    Alert.alert('Senha alterada', 'Entre novamente com a nova senha.');
    await sair({ revogarNoServidor: false }).catch(() => {});
  }

  function confirmarSaida() {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        // O aparelho sai do push enquanto a sessão ainda vale (o DELETE precisa do token). `sair` limpa o estado antes
        // de tocar no armazenamento seguro: se ele falhar, a sessão já foi encerrada.
        onPress: () => {
          void desregistrarPushSemTravar().then(() =>
            sair().catch(() => {
              Alert.alert(
                'Não foi possível concluir a saída',
                'A sessão foi encerrada neste aparelho, mas o acesso salvo pode voltar ao reabrir o app.',
              );
            }),
          );
        },
      },
    ]);
  }

  return (
    <Tela>
      <Card titulo="Conta" icone="usuario">
        <Texto cor="secundario">Conectado como</Texto>
        <Texto negrito>{email ?? '—'}</Texto>
      </Card>
      <CardAlterarSenha aoAlterar={trocarSenha} />
      <Card titulo="Notificações" icone="sino">
        <Texto cor="secundario">{naoLidas === 1 ? '1 não lida' : naoLidas > 0 ? `${naoLidas} não lidas` : 'Nenhuma não lida'}</Texto>
        <Botao titulo="Abrir notificações" variante="secundario" onPress={() => router.push('/notificacoes')} />
      </Card>
      <CardPush
        situacao={situacaoDoPush}
        motivo={motivoDoPush}
        erro={erroDoPush}
        ligado={pushEfetivo}
        ocupado={situacaoDoPush === 'verificando'}
        aoAlternar={(ligar) => {
          if (ligar) {
            void ligarPush();
            return;
          }
          // O aparelho só sai do push quando o servidor confirma: sem isso a escolha não muda e o usuário é avisado.
          desligarPush().catch((erro) =>
            Alert.alert('Não foi possível desligar as notificações push', mensagemDeErro(erro)),
          );
        }}
        aoTentarNovamente={() => void sincronizarPush({ pedirPermissao: true })}
        aoAbrirConfiguracoes={() => void Linking.openSettings()}
      />
      <CardNotificarPorAtivo
        itens={watchlist.data}
        carregando={watchlist.isPending}
        erro={watchlist.error}
        // `mutateAsync` avisa a falha de cada alteração (o `onError` de `mutate` só vale para a última chamada).
        aoAlternar={(ativoId, notificar) =>
          void definirNotificacao
            .mutateAsync({ ativoId, notificar })
            .catch((erro) => Alert.alert('Não foi possível alterar as notificações', mensagemDeErro(erro)))
        }
        aoTentarNovamente={() => void watchlist.refetch()}
      />
      <CardServidor url={urlDoServidor()} resultado={resultadoDaConexao} testando={testando} aoTestar={() => void testar()} />
      <Card titulo="Aparência" icone="lua" tomIcone="destaque">
        <SeletorSegmentado
          rotulo="Tema do aplicativo"
          opcoes={TEMAS}
          selecionado={tema}
          aoSelecionar={(valor) => void definirTema(valor)}
        />
      </Card>
      <Botao titulo="Sair" variante="perigo" onPress={confirmarSaida} />
      <Texto variante="legenda" cor="secundario" style={{ textAlign: 'center' }}>
        Ferramenta educacional de análise. Não constitui recomendação de investimento.
      </Texto>
    </Tela>
  );
}
