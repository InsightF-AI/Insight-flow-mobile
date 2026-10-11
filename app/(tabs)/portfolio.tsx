import type { UseQueryResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import type { ApiError } from '@/api/client';
import type { Comparativo, CotacaoAtual, Operacao, Uuid } from '@/api/tipos';
import { BotaoFlutuante } from '@/components/BotaoFlutuante';
import { Card } from '@/components/Card';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoConsulta } from '@/components/EstadoConsulta';
import { EstadoVazio } from '@/components/EstadoVazio';
import { GraficoDistribuicao } from '@/components/GraficoDistribuicao';
import { ItemOperacao } from '@/components/ItemOperacao';
import { ItemPosicao } from '@/components/ItemPosicao';
import { Kpi } from '@/components/Kpi';
import { Linha } from '@/components/Linha';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import {
  kpiLucroRealizado,
  kpiPatrimonio,
  kpiResultado,
  kpiVariacaoDoDia,
  posicoesSemCotacao,
  tomDoKpi,
  variacaoDoDia,
} from '@/dominio/inicio';
import { mensagemErroOperacao } from '@/dominio/operacao';
import {
  ativosSemCotacao,
  type DimensaoDistribuicao,
  descreverDadosParciais,
  type FiltroPosicoes,
  filtrarPosicoes,
  filtrosDasPosicoes,
  mapaAtivos,
  percentualDaCarteiraConfiavel,
  prepararDistribuicao,
  rotuloDoFiltro,
} from '@/dominio/portfolio';
import { useCotacoes } from '@/hooks/useAtivo';
import {
  useBenchmark,
  useDistribuicao,
  useOperacoes,
  usePosicoes,
  useRemoverOperacao,
  useRentabilidade,
} from '@/hooks/usePortfolio';
import { useWatchlist } from '@/hooks/useWatchlist';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { ehStatus } from '@/utils/erros';
import { formatarPercentual } from '@/utils/formatacao';

const DIMENSOES: readonly { valor: DimensaoDistribuicao; rotulo: string }[] = [
  { valor: 'classe', rotulo: 'Classe' },
  { valor: 'setor', rotulo: 'Setor' },
  { valor: 'moeda', rotulo: 'Moeda' },
];

type ConsultaComparativo = UseQueryResult<Comparativo, ApiError>;

function textoDoBenchmark(consulta: ConsultaComparativo): string {
  const valor = consulta.data?.rentabilidade_benchmark_percentual;
  if (consulta.isError || valor === null || valor === undefined) return 'indisponível';
  return formatarPercentual(valor, 'fracao');
}

function ComparativoBenchmarks({
  cdi,
  ibovespa,
  carteiraConfiavel,
}: {
  cdi: ConsultaComparativo;
  ibovespa: ConsultaComparativo;
  /** Falso com ativo sem cotação ou sem posição aberta: o percentual do backend não representa a carteira. */
  carteiraConfiavel: boolean;
}) {
  if (cdi.isPending || ibovespa.isPending) return <Carregando />;
  if (ehStatus(cdi.error, 404) || ehStatus(ibovespa.error, 404)) {
    return <EstadoVazio mensagem="Registre uma operação para comparar com CDI e Ibovespa." />;
  }
  const carteira = cdi.data?.rentabilidade_carteira_percentual ?? ibovespa.data?.rentabilidade_carteira_percentual;
  return (
    <>
      {carteira !== undefined ? (
        <Linha rotulo="Carteira" valor={carteiraConfiavel ? formatarPercentual(carteira, 'fracao') : 'indisponível'} />
      ) : null}
      <Linha rotulo="CDI" valor={textoDoBenchmark(cdi)} />
      <Linha rotulo="Ibovespa" valor={textoDoBenchmark(ibovespa)} />
    </>
  );
}

export default function Portfolio() {
  const tema = useTema();
  const operacoes = useOperacoes();
  const rentabilidade = useRentabilidade();
  const cdi = useBenchmark('CDI');
  const ibovespa = useBenchmark('IBOVESPA');
  const distribuicao = useDistribuicao();
  const posicoes = usePosicoes();
  const watchlist = useWatchlist();
  const removerOperacao = useRemoverOperacao();
  const [dimensao, setDimensao] = useState<DimensaoDistribuicao>('classe');
  const [filtro, setFiltro] = useState<FiltroPosicoes>('TODAS');
  const ativos = mapaAtivos(posicoes.data, watchlist.data);

  // Variação do dia por posição: mesma chave de cotação do Início, então não repete a consulta.
  const idsDasPosicoes = useMemo(() => (posicoes.data ?? []).map((posicao) => posicao.ativo_id), [posicoes.data]);
  const consultasCotacao = useCotacoes(idsDasPosicoes);
  const cotacaoPorAtivo = new Map<Uuid, (typeof consultasCotacao)[number]>();
  idsDasPosicoes.forEach((id, indice) => cotacaoPorAtivo.set(id, consultasCotacao[indice]));
  const cotacoesPorId = new Map<Uuid, CotacaoAtual | undefined>(
    idsDasPosicoes.map((id, indice) => [id, consultasCotacao[indice]?.data]),
  );

  function atualizar() {
    for (const consulta of [operacoes, rentabilidade, cdi, ibovespa, distribuicao, posicoes, ...consultasCotacao]) {
      void consulta.refetch();
    }
  }

  function confirmarRemocao(operacao: Operacao) {
    Alert.alert('Remover operação', 'Remover esta operação simulada do histórico?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          removerOperacao.mutate(operacao.id, {
            onError: (erro) => Alert.alert('Não foi possível remover', mensagemErroOperacao(erro, 'remover')),
          }),
      },
    ]);
  }

  if (operacoes.isPending) return <Carregando />;
  if (operacoes.isError) {
    return <ErroComRetry erro={operacoes.error} aoTentarNovamente={() => void operacoes.refetch()} />;
  }
  if (operacoes.data.length === 0) {
    return (
      <Tela>
        <EstadoVazio
          mensagem="Nenhuma operação simulada registrada."
          acao={{ titulo: 'Registrar operação', onPress: () => router.push('/operacao/nova') }}
        />
      </Tela>
    );
  }

  // Ativos com saldo nas operações que o backend não conseguiu cotar (ele omite a posição e soma o custo).
  const semCotacao = posicoes.data ? ativosSemCotacao(operacoes.data, posicoes.data) : [];
  const todasSemCotacao = posicoes.data?.length === 0 && semCotacao.length > 0;
  const semCotacaoNoServidor = posicoesSemCotacao(rentabilidade.data, posicoes.data) || todasSemCotacao;
  const rentabilidadeIndisponivel = rentabilidade.isError && rentabilidade.data === undefined;
  const patrimonio = rentabilidade.data ? kpiPatrimonio(rentabilidade.data, semCotacao.length) : null;
  const resultado = rentabilidade.data ? kpiResultado(rentabilidade.data, semCotacao.length) : null;
  const realizado = rentabilidade.data ? kpiLucroRealizado(rentabilidade.data) : null;
  const variacao = posicoes.data
    ? kpiVariacaoDoDia(variacaoDoDia(posicoes.data, cotacoesPorId), semCotacaoNoServidor, semCotacao.length)
    : null;
  const carregandoVariacao = posicoes.isPending || consultasCotacao.some((consulta) => consulta.isPending);
  const carteiraConfiavel = rentabilidade.data
    ? percentualDaCarteiraConfiavel(rentabilidade.data, semCotacao.length)
    : false;

  // Operações e posições recarregam em paralelo depois de uma remoção: com uma delas ainda a caminho o saldo e a lista
  // não são do mesmo instante e o aviso apareceria falso. Só avisa com os dois dados assentados.
  const dadosAssentados = !posicoes.isFetching && !operacoes.isFetching;
  const avisoDeDadosParciais = dadosAssentados ? descreverDadosParciais(semCotacao, ativos) : null;

  const filtros = filtrosDasPosicoes(posicoes.data ?? [], ativos);
  const filtroAtivo = filtros.includes(filtro) ? filtro : 'TODAS';

  return (
    <View style={estilos.tela}>
      <Tela aoAtualizar={atualizar} atualizando={operacoes.isRefetching}>
        <Texto variante="legenda" cor="secundario">
          Carteira simulada: as operações são registradas só neste sistema e nenhuma ordem é enviada a corretoras.
          Ferramenta educacional de análise, não constitui recomendação de investimento.
        </Texto>

        {avisoDeDadosParciais ? (
          <Card titulo="Dados parciais" icone="info" tomIcone="destaque">
            <Texto role="alert">{avisoDeDadosParciais}</Texto>
          </Card>
        ) : null}

        <View style={estilos.kpis}>
          <Kpi
            rotulo="Patrimônio simulado"
            icone="carteira"
            valor={rentabilidadeIndisponivel ? 'indisponível' : (patrimonio?.valor ?? '')}
            dica={patrimonio?.dica}
            carregando={rentabilidade.isPending}
          />
          <Kpi
            rotulo="Resultado não realizado"
            icone="tendencia"
            tomIcone={tomDoKpi(resultado?.cor ?? 'padrao')}
            corValor={resultado?.cor}
            valor={rentabilidadeIndisponivel ? 'indisponível' : (resultado?.valor ?? '')}
            dica={resultado?.dica}
            carregando={rentabilidade.isPending}
          />
          <Kpi
            rotulo="Lucro realizado"
            icone="carteira"
            tomIcone={tomDoKpi(realizado?.cor ?? 'padrao')}
            corValor={realizado?.cor}
            valor={rentabilidadeIndisponivel ? 'indisponível' : (realizado?.valor ?? '')}
            dica={realizado?.dica}
            carregando={rentabilidade.isPending}
          />
          <Kpi
            rotulo="Variação do dia"
            icone="atividade"
            tomIcone={tomDoKpi(variacao?.cor ?? 'padrao')}
            corValor={variacao?.cor}
            valor={posicoes.isError && posicoes.data === undefined ? 'indisponível' : (variacao?.valor ?? '')}
            dica={variacao?.dica}
            carregando={carregandoVariacao}
          />
        </View>

        <Card titulo="Comparativo desde a 1ª operação" icone="tendencia">
          <ComparativoBenchmarks cdi={cdi} ibovespa={ibovespa} carteiraConfiavel={carteiraConfiavel} />
        </Card>

        <Card titulo="Distribuição" icone="grafico-pizza">
          <SeletorSegmentado
            rotulo="Agrupar distribuição por"
            opcoes={DIMENSOES}
            selecionado={dimensao}
            aoSelecionar={setDimensao}
          />
          <EstadoConsulta consulta={distribuicao}>
            {(dados) => {
              const fatias = prepararDistribuicao(dados, dimensao, tema.serie);
              if (fatias.length > 0) return <GraficoDistribuicao fatias={fatias} />;
              return (
                <EstadoVazio
                  mensagem={
                    semCotacao.length > 0
                      ? 'Sem cotação das posições para montar a distribuição.'
                      : 'Sem posições em carteira.'
                  }
                />
              );
            }}
          </EstadoConsulta>
        </Card>

        <Card titulo="Posições" icone="lista">
          <EstadoConsulta consulta={posicoes}>
            {(lista) => {
              if (lista.length === 0) {
                return (
                  <EstadoVazio
                    mensagem={
                      semCotacao.length > 0
                        ? 'As posições abertas estão sem cotação no momento.'
                        : 'Nenhuma posição em aberto.'
                    }
                  />
                );
              }
              return (
                <>
                  {filtros.length > 1 ? (
                    <SeletorSegmentado
                      rotulo="Filtrar posições por classe"
                      opcoes={filtros.map((valor) => ({ valor, rotulo: rotuloDoFiltro(valor) }))}
                      selecionado={filtroAtivo}
                      aoSelecionar={setFiltro}
                    />
                  ) : null}
                  {filtrarPosicoes(lista, ativos, filtroAtivo).map((posicao) => {
                    const consulta = cotacaoPorAtivo.get(posicao.ativo_id);
                    const variacaoDaPosicao = consulta?.data
                      ? consulta.data.variacao_percentual
                      : consulta?.isError
                        ? null
                        : undefined;
                    return (
                      <ItemPosicao
                        key={posicao.ativo_id}
                        posicao={posicao}
                        moeda={ativos.get(posicao.ativo_id)?.moeda}
                        variacaoDoDia={variacaoDaPosicao}
                        aoPressionar={() =>
                          router.push({
                            pathname: '/ativo/[id]',
                            params: { id: posicao.ativo_id, ticker: posicao.ticker },
                          })
                        }
                      />
                    );
                  })}
                </>
              );
            }}
          </EstadoConsulta>
        </Card>

        <Card titulo="Operações simuladas" icone="lista">
          {operacoes.data.map((operacao) => {
            const info = ativos.get(operacao.ativo_id);
            return (
              <ItemOperacao
                key={operacao.id}
                operacao={operacao}
                ticker={info?.ticker ?? null}
                moeda={info?.moeda}
                removendo={removerOperacao.isPending && removerOperacao.variables === operacao.id}
                aoRemover={() => confirmarRemocao(operacao)}
              />
            );
          })}
        </Card>

        <View style={estilos.espacoDoBotao} />
      </Tela>
      <BotaoFlutuante rotulo="Nova operação" icone="mais" onPress={() => router.push('/operacao/nova')} />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.md },
  espacoDoBotao: { height: 72 },
});
