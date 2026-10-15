import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';

import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { type EstadoCotacao, LinhaAtivo } from '@/components/LinhaAtivo';
import { useCotacoes } from '@/hooks/useAtivo';
import { useWatchlist } from '@/hooks/useWatchlist';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

function estadoDaCotacao(consulta?: { isPending: boolean; isError: boolean }): EstadoCotacao {
  if (!consulta || consulta.isPending) return 'carregando';
  return consulta.isError ? 'indisponivel' : 'ok';
}

export default function Watchlist() {
  const { cores } = useTema();
  const watchlist = useWatchlist();
  const itens = watchlist.data ?? [];
  const cotacoes = useCotacoes(itens.map((item) => item.ativo.id));

  if (watchlist.isPending) return <Carregando />;
  if (watchlist.isError) {
    return <ErroComRetry erro={watchlist.error} aoTentarNovamente={() => void watchlist.refetch()} />;
  }

  function atualizar() {
    void watchlist.refetch();
    cotacoes.forEach((cotacao) => void cotacao.refetch());
  }

  return (
    <FlatList
      style={{ backgroundColor: cores.fundo }}
      contentContainerStyle={estilos.lista}
      data={itens}
      keyExtractor={(item) => item.ativo.id}
      refreshControl={
        <RefreshControl refreshing={watchlist.isRefetching} onRefresh={atualizar} tintColor={cores.primaria} />
      }
      ListEmptyComponent={
        <EstadoVazio
          mensagem="Sua watchlist está vazia."
          acao={{ titulo: 'Buscar ativo', onPress: () => router.push('/buscar') }}
        />
      }
      renderItem={({ item, index }) => {
        const cotacao = cotacoes[index];
        return (
          <LinhaAtivo
            ativo={item.ativo}
            cotacao={cotacao?.data}
            estadoCotacao={estadoDaCotacao(cotacao)}
            aoPressionar={() =>
              router.push({ pathname: '/ativo/[id]', params: { id: item.ativo.id, ticker: item.ativo.ticker } })
            }
          />
        );
      }}
    />
  );
}

const estilos = StyleSheet.create({
  lista: { padding: espaco.lg, gap: espaco.md, flexGrow: 1 },
});
