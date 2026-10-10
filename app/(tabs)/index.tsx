import type { UseQueryResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import type { CotacaoAtual, Sinal, Uuid } from '@/api/tipos';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoVazio } from '@/components/EstadoVazio';
import { ItemSinalAtivo } from '@/components/ItemSinalAtivo';
import { Kpi } from '@/components/Kpi';
import { type EstadoCotacao, LinhaAtivo } from '@/components/LinhaAtivo';
import { ResumoDiarioCard } from '@/components/ResumoDiarioCard';
import { Skeleton } from '@/components/Skeleton';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import {
  descreverBacktest,
  kpiPatrimonio,
  kpiResultado,
  kpiSinais,
  kpiVariacaoDoDia,
  ordenarWatchlist,
  reunirSinais,
  ultimoResumoDiario,
  variacaoDoDia,
} from '@/dominio/inicio';
import { useBacktestsDosSinais, useCotacoes, useSinaisDosAtivos } from '@/hooks/useAtivo';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { usePosicoes, useRentabilidade } from '@/hooks/usePortfolio';
import { useDefinirNotificacao, useWatchlist } from '@/hooks/useWatchlist';
import { espaco } from '@/theme/escala';
import { mensagemDeErro } from '@/utils/erros';

function estadoDaCotacao(consulta?: { isPending: boolean; isError: boolean }): EstadoCotacao {
  if (!consulta || consulta.isPending) return 'carregando';
  return consulta.isError ? 'indisponivel' : 'ok';
}

export default function Inicio() {
  const watchlist = useWatchlist();
  const rentabilidade = useRentabilidade();
  const posicoes = usePosicoes();
  const notificacoes = useNotificacoes();
  const definirNotificacao = useDefinirNotificacao();

  const itens = useMemo(() => ordenarWatchlist(watchlist.data ?? []), [watchlist.data]);
  const idsDaWatchlist = itens.map((item) => item.ativo.id);
  // Posições podem ter ativos que não estão na watchlist; a chave é a mesma, então não há consulta repetida.
  const idsDeCotacao = Array.from(new Set([...idsDaWatchlist, ...(posicoes.data ?? []).map((p) => p.ativo_id)]));
  const cotacoes = useCotacoes(idsDeCotacao);
  const consultasSinais = useSinaisDosAtivos(idsDaWatchlist);

  const cotacaoPorId = new Map<Uuid, UseQueryResult<CotacaoAtual, Error>>();
  idsDeCotacao.forEach((id, indice) => cotacaoPorId.set(id, cotacoes[indice]));
  const cotacoesPorId = new Map<Uuid, CotacaoAtual | undefined>(
    idsDeCotacao.map((id, indice) => [id, cotacoes[indice].data]),
  );
  const sinaisPorAtivo = new Map<Uuid, Sinal[] | undefined>();
  idsDaWatchlist.forEach((id, indice) => sinaisPorAtivo.set(id, consultasSinais[indice].data));

  const sinaisAtivos = reunirSinais(itens, sinaisPorAtivo);
  const backtests = useBacktestsDosSinais(
    sinaisAtivos.map(({ ativo, sinal }) => ({ ativoId: ativo.id, regraId: sinal.regra_id })),
  );

  const carregandoSinais = consultasSinais.some((consulta) => consulta.isPending);
  const ativosSemSinais = consultasSinais.filter((consulta) => consulta.isError).length;
  const carregandoVariacao =
    posicoes.isPending || (posicoes.data ?? []).some((p) => cotacaoPorId.get(p.ativo_id)?.isPending ?? false);

  function atualizar() {
    const consultas: { refetch: () => unknown }[] = [
      watchlist,
      rentabilidade,
      posicoes,
      notificacoes,
      ...cotacoes,
      ...consultasSinais,
      ...backtests,
    ];
    consultas.forEach((consulta) => void consulta.refetch());
  }

  function alternarNotificacao(ativoId: Uuid, notificar: boolean) {
    if (definirNotificacao.isPending) return;
    definirNotificacao.mutate(
      { ativoId, notificar: !notificar },
      { onError: (erro) => Alert.alert('Não foi possível alterar as notificações', mensagemDeErro(erro)) },
    );
  }

  const patrimonio = rentabilidade.data ? kpiPatrimonio(rentabilidade.data) : null;
  const resultado = rentabilidade.data ? kpiResultado(rentabilidade.data) : null;
  const variacao = posicoes.data ? kpiVariacaoDoDia(variacaoDoDia(posicoes.data, cotacoesPorId)) : null;
  const sinaisKpi = kpiSinais({ total: sinaisAtivos.length, semDados: ativosSemSinais });
  const resumo = ultimoResumoDiario(notificacoes.data);

  return (
    <Tela aoAtualizar={atualizar} atualizando={watchlist.isRefetching}>
      <View style={estilos.kpis}>
        <Kpi
          rotulo="Patrimônio simulado"
          icone="carteira"
          valor={rentabilidade.isError ? 'indisponível' : (patrimonio?.valor ?? '')}
          dica={patrimonio?.dica}
          carregando={rentabilidade.isPending}
        />
        <Kpi
          rotulo="Resultado não realizado"
          icone="tendencia"
          tomIcone={resultado?.cor === 'negativo' ? 'negativo' : 'positivo'}
          corValor={resultado?.cor}
          valor={rentabilidade.isError ? 'indisponível' : (resultado?.valor ?? '')}
          dica={resultado?.dica}
          carregando={rentabilidade.isPending}
        />
        <Kpi
          rotulo="Variação do dia"
          icone="atividade"
          tomIcone={variacao?.cor === 'negativo' ? 'negativo' : 'positivo'}
          corValor={variacao?.cor}
          valor={posicoes.isError ? 'indisponível' : (variacao?.valor ?? '')}
          dica={variacao?.dica}
          carregando={carregandoVariacao}
        />
        <Kpi
          rotulo="Sinais ativos"
          icone="atividade"
          tomIcone="destaque"
          valor={sinaisKpi.valor}
          dica={sinaisKpi.dica}
          carregando={carregandoSinais}
        />
      </View>

      <ResumoDiarioCard
        estado={notificacoes.isPending ? 'carregando' : notificacoes.isError ? 'erro' : 'ok'}
        erro={notificacoes.error}
        resumo={resumo}
        aoTentarNovamente={() => void notificacoes.refetch()}
      />

      <Texto variante="subtitulo" role="heading">
        Watchlist
      </Texto>
      {watchlist.isPending ? (
        <>
          <Skeleton altura={72} />
          <Skeleton altura={72} />
          <Skeleton altura={72} />
        </>
      ) : null}
      {watchlist.isError ? (
        <ErroComRetry erro={watchlist.error} aoTentarNovamente={() => void watchlist.refetch()} />
      ) : null}
      {watchlist.isSuccess && itens.length === 0 ? (
        <EstadoVazio
          mensagem="Sua watchlist está vazia."
          acao={{ titulo: 'Buscar ativo', onPress: () => router.push('/buscar') }}
        />
      ) : null}
      {itens.map((item, indice) => {
        const cotacao = cotacaoPorId.get(item.ativo.id);
        const sinais = consultasSinais[indice];
        return (
          <LinhaAtivo
            key={item.ativo.id}
            ativo={item.ativo}
            cotacao={cotacao?.data}
            estadoCotacao={estadoDaCotacao(cotacao)}
            sinais={sinais?.data?.length}
            notificar={item.notificar}
            aoAlternarNotificacao={() => alternarNotificacao(item.ativo.id, item.notificar)}
            aoPressionar={() =>
              router.push({ pathname: '/ativo/[id]', params: { id: item.ativo.id, ticker: item.ativo.ticker } })
            }
          />
        );
      })}

      <Texto variante="subtitulo" role="heading">
        Sinais técnicos ativos
      </Texto>
      {carregandoSinais && sinaisAtivos.length === 0 && idsDaWatchlist.length > 0 ? (
        <>
          <Skeleton altura={72} />
          <Skeleton altura={72} />
        </>
      ) : null}
      {!carregandoSinais && sinaisAtivos.length === 0 ? (
        <EstadoVazio mensagem="Nenhum sinal técnico ativo no momento." />
      ) : null}
      {sinaisAtivos.map(({ ativo, sinal }, indice) => {
        const backtest = backtests[indice];
        return (
          <ItemSinalAtivo
            key={sinal.id}
            ticker={ativo.ticker}
            regraNome={sinal.regra_nome}
            ativadoEm={sinal.data_ativacao}
            backtest={backtest?.data ? descreverBacktest(backtest.data) : undefined}
            carregandoBacktest={backtest?.isPending ?? true}
            aoPressionar={() => router.push({ pathname: '/ativo/[id]', params: { id: ativo.id, ticker: ativo.ticker } })}
          />
        );
      })}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.md },
});
