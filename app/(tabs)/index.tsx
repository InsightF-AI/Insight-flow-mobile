import type { UseQueryResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
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
  posicoesSemCotacao,
  reunirSinais,
  tomDoKpi,
  ultimoResumoDiario,
  variacaoDoDia,
} from '@/dominio/inicio';
import { ativosSemCotacao } from '@/dominio/portfolio';
import { useBacktestsDosSinais, useCotacoes, useSinaisDosAtivos } from '@/hooks/useAtivo';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { useOperacoes, usePosicoes, useRentabilidade } from '@/hooks/usePortfolio';
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
  const operacoes = useOperacoes();
  const notificacoes = useNotificacoes();
  const definirNotificacao = useDefinirNotificacao();
  // O spinner do "puxar para atualizar" só liga quando o usuário puxa (não a cada releitura em segundo plano).
  const [atualizando, setAtualizando] = useState(false);

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

  // Erro só "apaga" a seção quando não há dado anterior: uma releitura que falha não esconde o que já está na tela.
  const watchlistIndisponivel = watchlist.isError && watchlist.data === undefined;
  const rentabilidadeIndisponivel = rentabilidade.isError && rentabilidade.data === undefined;
  const posicoesIndisponiveis = posicoes.isError && posicoes.data === undefined;

  // Sem a watchlist não há ativos para consultar: o bloco de sinais espera por ela, nunca mostra "0" nem "vazio".
  const carregandoSinais = watchlist.isPending || consultasSinais.some((consulta) => consulta.isPending);
  const ativosSemSinais = consultasSinais.filter((consulta) => consulta.isError).length;
  const todosSemSinais = itens.length > 0 && ativosSemSinais === itens.length;
  const carregandoVariacao =
    posicoes.isPending ||
    rentabilidade.isPending ||
    operacoes.isPending ||
    (posicoes.data ?? []).some((p) => cotacaoPorId.get(p.ativo_id)?.isPending ?? false);

  async function atualizar() {
    const consultas: { refetch: () => unknown }[] = [
      watchlist,
      rentabilidade,
      posicoes,
      operacoes,
      notificacoes,
      ...cotacoes,
      ...consultasSinais,
      ...backtests,
    ];
    setAtualizando(true);
    try {
      await Promise.allSettled(consultas.map((consulta) => consulta.refetch()));
    } finally {
      setAtualizando(false);
    }
  }

  function alternarNotificacao(ativoId: Uuid, notificar: boolean) {
    if (definirNotificacao.isPending) return;
    definirNotificacao.mutate(
      { ativoId, notificar: !notificar },
      { onError: (erro) => Alert.alert('Não foi possível alterar as notificações', mensagemDeErro(erro)) },
    );
  }

  // Ativo com saldo e sem cotação: o backend soma o custo dele e omite o valor, e o "prejuízo" não existe.
  const semCotacao = operacoes.data && posicoes.data ? ativosSemCotacao(operacoes.data, posicoes.data).length : 0;
  const patrimonio = rentabilidade.data ? kpiPatrimonio(rentabilidade.data, semCotacao) : null;
  const resultado = rentabilidade.data ? kpiResultado(rentabilidade.data, semCotacao) : null;
  const variacao = posicoes.data
    ? kpiVariacaoDoDia(
        variacaoDoDia(posicoes.data, cotacoesPorId),
        posicoesSemCotacao(rentabilidade.data, posicoes.data),
        semCotacao,
      )
    : null;
  const sinaisKpi = kpiSinais({
    total: sinaisAtivos.length,
    semDados: ativosSemSinais,
    ativos: itens.length,
    watchlistIndisponivel,
  });
  const resumo = ultimoResumoDiario(notificacoes.data);

  return (
    <Tela aoAtualizar={() => void atualizar()} atualizando={atualizando}>
      <View style={estilos.kpis}>
        <Kpi
          rotulo="Patrimônio simulado"
          icone="carteira"
          valor={rentabilidadeIndisponivel ? 'indisponível' : (patrimonio?.valor ?? '')}
          dica={patrimonio?.dica}
          carregando={rentabilidade.isPending || operacoes.isPending}
        />
        <Kpi
          rotulo="Resultado não realizado"
          icone="tendencia"
          tomIcone={tomDoKpi(resultado?.cor ?? 'padrao')}
          corValor={resultado?.cor}
          valor={rentabilidadeIndisponivel ? 'indisponível' : (resultado?.valor ?? '')}
          dica={resultado?.dica}
          carregando={rentabilidade.isPending || operacoes.isPending}
        />
        <Kpi
          rotulo="Variação do dia"
          icone="atividade"
          tomIcone={tomDoKpi(variacao?.cor ?? 'padrao')}
          corValor={variacao?.cor}
          valor={posicoesIndisponiveis ? 'indisponível' : (variacao?.valor ?? '')}
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
        estado={notificacoes.data ? 'ok' : notificacoes.isError ? 'erro' : 'carregando'}
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
      {watchlistIndisponivel ? (
        <ErroComRetry erro={watchlist.error} aoTentarNovamente={() => void watchlist.refetch()} />
      ) : null}
      {watchlist.data !== undefined && itens.length === 0 ? (
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
            ocupado={definirNotificacao.isPending}
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
      {carregandoSinais ? (
        <>
          <Skeleton altura={72} />
          <Skeleton altura={72} />
        </>
      ) : null}
      {!carregandoSinais && watchlistIndisponivel ? (
        <Texto cor="secundario">Sinais indisponíveis no momento.</Texto>
      ) : null}
      {!carregandoSinais && !watchlistIndisponivel && todosSemSinais ? (
        <ErroComRetry
          erro={consultasSinais.find((consulta) => consulta.isError)?.error}
          mensagem="Sinais indisponíveis no momento."
          aoTentarNovamente={() => consultasSinais.forEach((consulta) => void consulta.refetch())}
        />
      ) : null}
      {!carregandoSinais && !watchlistIndisponivel && !todosSemSinais && sinaisAtivos.length === 0 ? (
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
