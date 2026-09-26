import type { UseQueryResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import type { ApiError } from '@/api/client';
import type { Comparativo, Operacao } from '@/api/tipos';
import { BotaoFlutuante } from '@/components/BotaoFlutuante';
import { Card } from '@/components/Card';
import { Carregando } from '@/components/Carregando';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoConsulta } from '@/components/EstadoConsulta';
import { EstadoVazio } from '@/components/EstadoVazio';
import { GraficoDistribuicao } from '@/components/GraficoDistribuicao';
import { ItemOperacao } from '@/components/ItemOperacao';
import { ItemPosicao } from '@/components/ItemPosicao';
import { Linha } from '@/components/Linha';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { VariacaoBadge } from '@/components/VariacaoBadge';
import { mensagemErroOperacao } from '@/dominio/operacao';
import { type DimensaoDistribuicao, mapaAtivos, prepararDistribuicao } from '@/dominio/portfolio';
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
import { formatarMoeda, formatarPercentual } from '@/utils/formatacao';

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

function ComparativoBenchmarks({ cdi, ibovespa }: { cdi: ConsultaComparativo; ibovespa: ConsultaComparativo }) {
  if (cdi.isPending || ibovespa.isPending) return <Carregando />;
  if (ehStatus(cdi.error, 404) || ehStatus(ibovespa.error, 404)) {
    return <EstadoVazio mensagem="Registre uma operação para comparar com CDI e Ibovespa." />;
  }
  const carteira = cdi.data?.rentabilidade_carteira_percentual ?? ibovespa.data?.rentabilidade_carteira_percentual;
  return (
    <>
      {carteira !== undefined ? <Linha rotulo="Carteira" valor={formatarPercentual(carteira, 'fracao')} /> : null}
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
  const ativos = mapaAtivos(posicoes.data, watchlist.data);

  function atualizar() {
    for (const consulta of [operacoes, rentabilidade, cdi, ibovespa, distribuicao, posicoes]) void consulta.refetch();
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

  return (
    <View style={estilos.tela}>
      <Tela aoAtualizar={atualizar} atualizando={operacoes.isRefetching}>
        <Card titulo="Resumo da carteira">
          <EstadoConsulta consulta={rentabilidade}>
            {(dados) => (
              <>
                <View style={estilos.destaque}>
                  <Texto variante="destaque">{formatarMoeda(dados.valor_mercado_brl, 'BRL')}</Texto>
                  <VariacaoBadge valor={dados.percentual} escala="fracao" />
                </View>
                <Linha rotulo="Custo base" valor={formatarMoeda(dados.custo_base_brl, 'BRL')} />
                <Linha rotulo="Lucro não realizado" valor={formatarMoeda(dados.lucro_nao_realizado_brl, 'BRL')} />
                <Linha rotulo="Lucro realizado" valor={formatarMoeda(dados.lucro_realizado_brl, 'BRL')} />
              </>
            )}
          </EstadoConsulta>
        </Card>

        <Card titulo="Comparativo desde a 1ª operação">
          <ComparativoBenchmarks cdi={cdi} ibovespa={ibovespa} />
        </Card>

        <Card titulo="Distribuição">
          <SeletorSegmentado
            rotulo="Agrupar distribuição por"
            opcoes={DIMENSOES}
            selecionado={dimensao}
            aoSelecionar={setDimensao}
          />
          <EstadoConsulta consulta={distribuicao}>
            {(dados) => {
              const fatias = prepararDistribuicao(dados, dimensao, tema.serie);
              return fatias.length > 0 ? (
                <GraficoDistribuicao fatias={fatias} />
              ) : (
                <EstadoVazio mensagem="Sem posições em carteira." />
              );
            }}
          </EstadoConsulta>
        </Card>

        <Card titulo="Posições">
          <EstadoConsulta consulta={posicoes}>
            {(lista) =>
              lista.length > 0 ? (
                lista.map((posicao) => (
                  <ItemPosicao key={posicao.ativo_id} posicao={posicao} moeda={ativos.get(posicao.ativo_id)?.moeda} />
                ))
              ) : (
                <EstadoVazio mensagem="Nenhuma posição em aberto." />
              )
            }
          </EstadoConsulta>
        </Card>

        <Card titulo="Operações simuladas">
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
      <BotaoFlutuante rotulo="Nova operação" icone="add" onPress={() => router.push('/operacao/nova')} />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  destaque: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco.md },
  espacoDoBotao: { height: 72 },
});
