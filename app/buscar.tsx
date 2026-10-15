import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

import type { AtivoEncontrado } from '@/api/tipos';
import { Campo } from '@/components/Campo';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { LinhaResultadoBusca } from '@/components/LinhaResultadoBusca';
import { Texto } from '@/components/Texto';
import { TAMANHO_MINIMO_BUSCA, useBuscaAtivos, useDebounce } from '@/hooks/useBusca';
import { useResolverAtivo } from '@/hooks/useResolverAtivo';
import { useWatchlist } from '@/hooks/useWatchlist';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { mensagemDeErro } from '@/utils/erros';

const ATRASO_BUSCA_MS = 400;

export default function Buscar() {
  const { cores } = useTema();
  const [termo, setTermo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const termoAtrasado = useDebounce(termo.trim(), ATRASO_BUSCA_MS);
  const busca = useBuscaAtivos(termoAtrasado);
  const resolver = useResolverAtivo();
  const watchlist = useWatchlist();
  const idPorTicker = new Map((watchlist.data ?? []).map((item) => [item.ativo.ticker.toUpperCase(), item.ativo.id]));

  async function adicionarEAbrir(ativo: AtivoEncontrado) {
    setErro(null);
    try {
      const { ativoId } = await resolver.mutateAsync(ativo.ticker);
      router.replace({ pathname: '/ativo/[id]', params: { id: ativoId, ticker: ativo.ticker } });
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  }

  function aoEscolher(ativo: AtivoEncontrado) {
    // A lista segue tocável durante a adição: ignora toques até a resolução terminar (evita duas adições e duas navegações).
    if (resolver.isPending) return;
    const idNaWatchlist = idPorTicker.get(ativo.ticker.toUpperCase());
    if (idNaWatchlist) {
      router.replace({ pathname: '/ativo/[id]', params: { id: idNaWatchlist, ticker: ativo.ticker } });
      return;
    }
    // Adição explícita: o ativo só entra na watchlist (e passa a ter análise) com a confirmação do usuário.
    Alert.alert('Adicionar à watchlist', `Adicionar ${ativo.ticker} à sua watchlist para ver o gráfico e a análise?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Adicionar', onPress: () => void adicionarEAbrir(ativo) },
    ]);
  }

  function resultados() {
    if (termoAtrasado.length < TAMANHO_MINIMO_BUSCA) {
      return <EstadoVazio mensagem="Digite ao menos 2 caracteres do ticker ou do nome." />;
    }
    if (busca.isPending) return <Carregando />;
    if (busca.isError) return <ErroComRetry erro={busca.error} aoTentarNovamente={() => void busca.refetch()} />;
    if (busca.data.length === 0) {
      return <EstadoVazio mensagem={`Nenhum ativo encontrado para “${termoAtrasado}”.`} />;
    }
    return (
      <FlatList
        data={busca.data}
        keyExtractor={(ativo) => ativo.ticker}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <LinhaResultadoBusca
            ativo={item}
            naWatchlist={idPorTicker.has(item.ticker.toUpperCase())}
            aoPressionar={() => aoEscolher(item)}
          />
        )}
      />
    );
  }

  return (
    <View style={[estilos.tela, { backgroundColor: cores.fundo }]}>
      <Campo
        rotulo="Ticker ou nome"
        valor={termo}
        aoMudar={(texto) => {
          setErro(null);
          setTermo(texto);
        }}
        placeholder="Ex.: PETR4, Vale"
        autoCapitalize="characters"
        icone="busca"
      />
      {erro ? (
        <Texto role="alert" cor="negativo">
          {erro}
        </Texto>
      ) : null}
      {resolver.isPending ? <Carregando mensagem="Adicionando à watchlist…" /> : null}
      <View style={estilos.resultados}>{resultados()}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, padding: espaco.lg, gap: espaco.md },
  resultados: { flex: 1 },
});
