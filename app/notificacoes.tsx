import { useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { ItemNotificacao } from '@/components/ItemNotificacao';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { mapaAtivos } from '@/dominio/portfolio';
import { useAbrirNotificacao } from '@/hooks/useAbrirNotificacao';
import { useMarcarTodasLidas, useNotificacoes } from '@/hooks/useNotificacoes';
import { useWatchlist } from '@/hooks/useWatchlist';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { mensagemDeErro } from '@/utils/erros';

type Filtro = 'nao_lidas' | 'todas';

const FILTROS: readonly { valor: Filtro; rotulo: string }[] = [
  { valor: 'nao_lidas', rotulo: 'Não lidas' },
  { valor: 'todas', rotulo: 'Todas' },
];

export default function Notificacoes() {
  const { cores } = useTema();
  const notificacoes = useNotificacoes();
  const watchlist = useWatchlist();
  const marcarTodas = useMarcarTodasLidas();
  const abrir = useAbrirNotificacao();
  const [filtro, setFiltro] = useState<Filtro>('nao_lidas');

  const ativos = mapaAtivos(undefined, watchlist.data);
  const todas = notificacoes.data ?? [];
  const naoLidas = todas.filter((notificacao) => !notificacao.lida);
  const lista = filtro === 'nao_lidas' ? naoLidas : todas;

  function marcarTodasComoLidas() {
    const ids = naoLidas.map((notificacao) => notificacao.id);
    marcarTodas.mutate(ids, {
      onSuccess: ({ falhas }) => {
        if (falhas > 0) {
          Alert.alert(
            'Algumas notificações não foram marcadas',
            `${falhas} de ${ids.length} não puderam ser marcadas como lidas. Tente novamente.`,
          );
        }
      },
      onError: (erro) => Alert.alert('Não foi possível marcar como lidas', mensagemDeErro(erro)),
    });
  }

  function listaVazia() {
    if (notificacoes.isPending) return <Carregando />;
    if (notificacoes.isError) {
      return <ErroComRetry erro={notificacoes.error} aoTentarNovamente={() => void notificacoes.refetch()} />;
    }
    return (
      <EstadoVazio
        mensagem={filtro === 'nao_lidas' ? 'Nenhuma notificação não lida.' : 'Nenhuma notificação por enquanto.'}
      />
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: cores.fundo }}
      contentContainerStyle={estilos.lista}
      data={lista}
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
          <SeletorSegmentado rotulo="Filtro das notificações" opcoes={FILTROS} selecionado={filtro} aoSelecionar={setFiltro} />
          {naoLidas.length > 0 ? (
            <Botao
              titulo="Marcar todas como lidas"
              variante="secundario"
              onPress={marcarTodasComoLidas}
              carregando={marcarTodas.isPending}
            />
          ) : null}
        </View>
      }
      ListEmptyComponent={listaVazia()}
      renderItem={({ item }) => (
        <ItemNotificacao
          notificacao={item}
          ticker={item.ativo_id ? (ativos.get(item.ativo_id)?.ticker ?? null) : null}
          aoPressionar={() => abrir(item)}
        />
      )}
    />
  );
}

const estilos = StyleSheet.create({
  lista: { padding: espaco.lg, gap: espaco.md, flexGrow: 1 },
  cabecalho: { gap: espaco.md, marginBottom: espaco.sm },
});
