import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, type TextInput, View } from 'react-native';

import type { Alerta, CotacaoAtual, TipoCondicaoAlerta, Uuid } from '@/api/tipos';
import { Botao } from '@/components/Botao';
import { Campo } from '@/components/Campo';
import { Card } from '@/components/Card';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { ItemAlerta } from '@/components/ItemAlerta';
import { MensagemErro } from '@/components/MensagemErro';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { SinalCard } from '@/components/SinalCard';
import { SugestoesTicker } from '@/components/SugestoesTicker';
import { Texto } from '@/components/Texto';
import { type ErrosAlerta, ROTULO_CONDICAO, validarAlerta } from '@/dominio/alerta';
import { ordenarWatchlist, reunirSinais } from '@/dominio/inicio';
import { useAlertas, useAtualizarAlerta, useCriarAlerta, useRemoverAlerta } from '@/hooks/useAlertas';
import { useBacktestsDosSinais, useCotacoes, useSinaisDosAtivos } from '@/hooks/useAtivo';
import { TAMANHO_MINIMO_BUSCA, useBuscaAtivos, useDebounce } from '@/hooks/useBusca';
import { useWatchlist } from '@/hooks/useWatchlist';
import { conteudoLimitado, espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { ehStatus, mensagemDeErro } from '@/utils/erros';
import { focarPrimeiroComErro } from '@/utils/formulario';

type Secao = 'preco' | 'sinais';

const SECOES: readonly { valor: Secao; rotulo: string }[] = [
  { valor: 'preco', rotulo: 'Preço' },
  { valor: 'sinais', rotulo: 'Sinais' },
];

const CONDICOES: readonly { valor: TipoCondicaoAlerta; rotulo: string }[] = [
  { valor: 'PRECO_MAIOR_IGUAL', rotulo: ROTULO_CONDICAO.PRECO_MAIOR_IGUAL },
  { valor: 'PRECO_MENOR_IGUAL', rotulo: ROTULO_CONDICAO.PRECO_MENOR_IGUAL },
];

const ATRASO_BUSCA_MS = 400;
const SUGESTOES_MAXIMAS = 6;

function FormNovoAlerta() {
  const criar = useCriarAlerta();
  const [ticker, setTicker] = useState('');
  const [tipoCondicao, setTipoCondicao] = useState<TipoCondicaoAlerta>('PRECO_MAIOR_IGUAL');
  const [valorAlvo, setValorAlvo] = useState('');
  const [erros, setErros] = useState<ErrosAlerta>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const campoTicker = useRef<TextInput>(null);
  const campoValor = useRef<TextInput>(null);

  const termo = useDebounce(ticker.trim(), ATRASO_BUSCA_MS);
  const busca = useBuscaAtivos(termo);
  const digitado = ticker.trim().toUpperCase();
  const sugestoes =
    termo.length >= TAMANHO_MINIMO_BUSCA
      ? (busca.data ?? [])
          .map((ativo) => ativo.ticker)
          .filter((sugerido) => sugerido !== digitado)
          .slice(0, SUGESTOES_MAXIMAS)
      : [];

  async function aoCriar() {
    if (criar.isPending) return;
    setErroGeral(null);
    const resultado = validarAlerta({ ticker, tipoCondicao, valorAlvo });
    if (!resultado.ok) {
      setErros(resultado.erros);
      focarPrimeiroComErro(resultado.erros, [
        ['ticker', campoTicker],
        ['valorAlvo', campoValor],
      ]);
      return;
    }
    setErros({});
    try {
      await criar.mutateAsync(resultado.dados);
      setTicker('');
      setValorAlvo('');
    } catch (erro) {
      if (ehStatus(erro, 404)) {
        setErros({ ticker: 'Ativo não encontrado' });
        campoTicker.current?.focus();
      } else setErroGeral(mensagemDeErro(erro));
    }
  }

  return (
    <Card titulo="Novo alerta de preço" icone="sino">
      <Campo
        ref={campoTicker}
        rotulo="Ticker"
        valor={ticker}
        aoMudar={setTicker}
        erro={erros.ticker}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="Ex.: PETR4"
        icone="busca"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => campoValor.current?.focus()}
      />
      <SugestoesTicker tickers={sugestoes} aoEscolher={setTicker} />
      <SeletorSegmentado rotulo="Condição do alerta" opcoes={CONDICOES} selecionado={tipoCondicao} aoSelecionar={setTipoCondicao} />
      <Campo
        ref={campoValor}
        rotulo="Valor alvo"
        valor={valorAlvo}
        aoMudar={setValorAlvo}
        erro={erros.valorAlvo}
        keyboardType="decimal-pad"
        placeholder="Ex.: 40,00"
        returnKeyType="done"
        onSubmitEditing={() => void aoCriar()}
      />
      <MensagemErro mensagem={erroGeral} />
      <Botao titulo="Criar alerta" onPress={aoCriar} carregando={criar.isPending} />
    </Card>
  );
}

function AlertasDePreco() {
  const { cores } = useTema();
  const alertas = useAlertas();
  const atualizar = useAtualizarAlerta();
  const remover = useRemoverAlerta();

  // Uma cotação por ativo, mesmo com vários alertas do mesmo ativo.
  const idsDosAtivos = useMemo(
    () => Array.from(new Set((alertas.data ?? []).map((alerta) => alerta.ativo.id))),
    [alertas.data],
  );
  const consultasCotacao = useCotacoes(idsDosAtivos);
  const cotacaoPorAtivo = new Map<Uuid, (typeof consultasCotacao)[number]>();
  idsDosAtivos.forEach((id, indice) => cotacaoPorAtivo.set(id, consultasCotacao[indice]));

  function alternar(alerta: Alerta, habilitado: boolean) {
    atualizar.mutate(
      { id: alerta.id, dados: { ativo: habilitado } },
      { onError: (erro) => Alert.alert('Não foi possível atualizar', mensagemDeErro(erro)) },
    );
  }

  function confirmarRemocao(alerta: Alerta) {
    Alert.alert('Remover alerta', `Remover o alerta de ${alerta.ativo.ticker}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          remover.mutate(alerta.id, {
            onError: (erro) => Alert.alert('Não foi possível remover', mensagemDeErro(erro)),
          }),
      },
    ]);
  }

  function listaVazia() {
    if (alertas.isPending) return <Carregando />;
    if (alertas.isError) return <ErroComRetry erro={alertas.error} aoTentarNovamente={() => void alertas.refetch()} />;
    return <EstadoVazio mensagem="Nenhum alerta cadastrado." />;
  }

  return (
    <FlatList
      style={{ backgroundColor: cores.fundo }}
      contentContainerStyle={estilos.lista}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      // O formulário fica no topo de uma lista sem KeyboardAvoidingView: no iOS a lista abre espaço para o teclado.
      automaticallyAdjustKeyboardInsets
      data={alertas.data ?? []}
      keyExtractor={(alerta) => alerta.id}
      refreshControl={
        <RefreshControl
          refreshing={alertas.isRefetching}
          onRefresh={() => {
            void alertas.refetch();
            consultasCotacao.forEach((consulta) => void consulta.refetch());
          }}
          tintColor={cores.primaria}
        />
      }
      ListHeaderComponent={
        <View style={estilos.cabecalho}>
          <FormNovoAlerta />
          <Texto variante="subtitulo" role="heading">
            Seus alertas
          </Texto>
        </View>
      }
      ListEmptyComponent={listaVazia()}
      renderItem={({ item }) => {
        const cotacao = cotacaoPorAtivo.get(item.ativo.id);
        const dados: CotacaoAtual | undefined = cotacao?.data;
        return (
          <ItemAlerta
            alerta={item}
            cotacao={dados ? { preco: dados.preco } : null}
            cotacaoIndisponivel={Boolean(cotacao?.isError)}
            ocupado={
              (atualizar.isPending && atualizar.variables?.id === item.id) ||
              (remover.isPending && remover.variables === item.id)
            }
            aoAlternar={(habilitado) => alternar(item, habilitado)}
            aoRemover={() => confirmarRemocao(item)}
          />
        );
      }}
    />
  );
}

function SinaisAtivos() {
  const { cores } = useTema();
  const watchlist = useWatchlist();
  const itens = useMemo(() => ordenarWatchlist(watchlist.data ?? []), [watchlist.data]);
  const ids = itens.map((item) => item.ativo.id);
  const consultasSinais = useSinaisDosAtivos(ids);
  const sinaisPorAtivo = new Map(ids.map((id, indice) => [id, consultasSinais[indice]?.data]));
  const sinais = reunirSinais(itens, sinaisPorAtivo);
  const backtests = useBacktestsDosSinais(
    sinais.map(({ ativo, sinal }) => ({ ativoId: ativo.id, regraId: sinal.regra_id })),
  );

  const carregando = watchlist.isPending || consultasSinais.some((consulta) => consulta.isPending);
  const todosComErro = itens.length > 0 && consultasSinais.every((consulta) => consulta.isError);

  function conteudoVazio() {
    if (carregando) return <Carregando />;
    if (watchlist.isError) {
      return <ErroComRetry erro={watchlist.error} aoTentarNovamente={() => void watchlist.refetch()} />;
    }
    if (itens.length === 0) {
      return (
        <EstadoVazio
          mensagem="Sua watchlist está vazia."
          acao={{ titulo: 'Buscar ativo', onPress: () => router.push('/buscar') }}
        />
      );
    }
    if (todosComErro) {
      return (
        <ErroComRetry
          erro={consultasSinais.find((consulta) => consulta.isError)?.error}
          mensagem="Sinais indisponíveis no momento."
          aoTentarNovamente={() => consultasSinais.forEach((consulta) => void consulta.refetch())}
        />
      );
    }
    return <EstadoVazio mensagem="Nenhum sinal técnico ativo no momento." />;
  }

  return (
    <FlatList
      style={{ backgroundColor: cores.fundo }}
      contentContainerStyle={estilos.lista}
      data={sinais}
      keyExtractor={({ sinal }) => sinal.id}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => {
            void watchlist.refetch();
            consultasSinais.forEach((consulta) => void consulta.refetch());
          }}
          tintColor={cores.primaria}
        />
      }
      ListEmptyComponent={conteudoVazio()}
      renderItem={({ item, index }) => (
        <View style={estilos.sinal}>
          <Pressable
            role="button"
            aria-label={`Abrir ${item.ativo.ticker}`}
            onPress={() =>
              router.push({ pathname: '/ativo/[id]', params: { id: item.ativo.id, ticker: item.ativo.ticker } })
            }
            style={estilos.tituloDoSinal}
          >
            <Texto variante="subtitulo" role="heading">
              {item.ativo.ticker}
            </Texto>
            <Texto variante="legenda" cor="secundario">
              {item.ativo.nome}
            </Texto>
          </Pressable>
          <SinalCard
            sinal={item.sinal}
            backtest={backtests[index]?.data}
            carregandoBacktest={backtests[index]?.isPending ?? true}
          />
        </View>
      )}
    />
  );
}

export default function Alertas() {
  const { cores } = useTema();
  const [secao, setSecao] = useState<Secao>('preco');
  return (
    <View style={[estilos.tela, { backgroundColor: cores.fundo }]}>
      <View style={estilos.seletor}>
        <SeletorSegmentado rotulo="Seção dos alertas" opcoes={SECOES} selecionado={secao} aoSelecionar={setSecao} />
      </View>
      {secao === 'preco' ? <AlertasDePreco /> : <SinaisAtivos />}
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  seletor: { ...conteudoLimitado, paddingHorizontal: espaco.lg, paddingTop: espaco.lg },
  lista: { ...conteudoLimitado, padding: espaco.lg, gap: espaco.md, flexGrow: 1 },
  cabecalho: { gap: espaco.lg },
  sinal: { gap: espaco.sm },
  tituloDoSinal: { minHeight: 44, justifyContent: 'center' },
});
