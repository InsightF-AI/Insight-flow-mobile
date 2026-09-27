import { router } from 'expo-router';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import type { Notificacao } from '@/api/tipos';
import { Botao } from '@/components/Botao';
import { Card } from '@/components/Card';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { ItemNotificacao } from '@/components/ItemNotificacao';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { Texto } from '@/components/Texto';
import { mapaAtivos } from '@/dominio/portfolio';
import { useMarcarLida, useNotificacoes } from '@/hooks/useNotificacoes';
import { useWatchlist } from '@/hooks/useWatchlist';
import { type EsquemaTema, usePreferencias } from '@/store/preferencias';
import { useSessao } from '@/store/sessao';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

const TEMAS: readonly { valor: EsquemaTema; rotulo: string }[] = [
  { valor: 'escuro', rotulo: 'Escuro' },
  { valor: 'claro', rotulo: 'Claro' },
];

export default function Perfil() {
  const { cores } = useTema();
  const tema = usePreferencias((estado) => estado.tema);
  const definirTema = usePreferencias((estado) => estado.definirTema);
  const email = useSessao((estado) => estado.email);
  const sair = useSessao((estado) => estado.sair);
  const notificacoes = useNotificacoes();
  const watchlist = useWatchlist();
  const marcarLida = useMarcarLida();
  const ativos = mapaAtivos(undefined, watchlist.data);

  function abrir(notificacao: Notificacao) {
    if (!notificacao.lida) marcarLida.mutate(notificacao.id);
    const ticker = ativos.get(notificacao.ativo_id)?.ticker;
    router.push({
      pathname: '/ativo/[id]',
      params: ticker ? { id: notificacao.ativo_id, ticker } : { id: notificacao.ativo_id },
    });
  }

  function confirmarSaida() {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        // `sair` limpa o estado antes de tocar no armazenamento seguro: se ele falhar, a sessão já foi encerrada.
        onPress: () => {
          void sair().catch(() => {
            Alert.alert(
              'Não foi possível concluir a saída',
              'A sessão foi encerrada neste aparelho, mas o acesso salvo pode voltar ao reabrir o app.',
            );
          });
        },
      },
    ]);
  }

  function listaVazia() {
    if (notificacoes.isPending) return <Carregando />;
    if (notificacoes.isError) {
      return <ErroComRetry erro={notificacoes.error} aoTentarNovamente={() => void notificacoes.refetch()} />;
    }
    return <EstadoVazio mensagem="Nenhuma notificação por enquanto." />;
  }

  return (
    <FlatList
      style={{ backgroundColor: cores.fundo }}
      contentContainerStyle={estilos.lista}
      data={notificacoes.data ?? []}
      keyExtractor={(notificacao) => notificacao.id}
      refreshControl={
        <RefreshControl
          refreshing={notificacoes.isRefetching}
          onRefresh={() => void notificacoes.refetch()}
          tintColor={cores.primaria}
        />
      }
      ListHeaderComponent={
        <View style={estilos.cabecalho}>
          <Card titulo="Conta" icone="usuario">
            <Texto cor="secundario">Conectado como</Texto>
            <Texto negrito>{email ?? '—'}</Texto>
          </Card>
          <Card titulo="Aparência" icone="lua" tomIcone="destaque">
            <SeletorSegmentado
              rotulo="Tema do aplicativo"
              opcoes={TEMAS}
              selecionado={tema}
              aoSelecionar={(valor) => void definirTema(valor)}
            />
          </Card>
          <Texto variante="subtitulo" role="heading">
            Notificações
          </Texto>
        </View>
      }
      ListEmptyComponent={listaVazia()}
      ListFooterComponent={
        <View style={estilos.rodape}>
          <Botao titulo="Sair" variante="perigo" onPress={confirmarSaida} />
          <Texto variante="legenda" cor="secundario" style={estilos.aviso}>
            Ferramenta educacional de análise. Não constitui recomendação de investimento.
          </Texto>
        </View>
      }
      renderItem={({ item }) => (
        <ItemNotificacao
          notificacao={item}
          ticker={ativos.get(item.ativo_id)?.ticker ?? null}
          aoPressionar={() => abrir(item)}
        />
      )}
    />
  );
}

const estilos = StyleSheet.create({
  lista: { padding: espaco.lg, gap: espaco.md, flexGrow: 1 },
  cabecalho: { gap: espaco.lg },
  rodape: { gap: espaco.md, marginTop: espaco.xl },
  aviso: { textAlign: 'center' },
});
