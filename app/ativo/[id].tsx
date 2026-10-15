import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import type { PeriodoHistorico } from '@/api/tipos';
import { Botao } from '@/components/Botao';
import { BotaoCabecalho } from '@/components/BotaoCabecalho';
import { Card } from '@/components/Card';
import { CardAnaliseIA } from '@/components/CardAnaliseIA';
import { EstadoConsulta } from '@/components/EstadoConsulta';
import { EstadoVazio } from '@/components/EstadoVazio';
import { GraficoPreco } from '@/components/GraficoPreco';
import { IndicadorItem } from '@/components/IndicadorItem';
import { Linha } from '@/components/Linha';
import { Pill } from '@/components/Pill';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { SinalCard } from '@/components/SinalCard';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { VariacaoBadge } from '@/components/VariacaoBadge';
import { ROTULO_TIPO_ATIVO } from '@/dominio/rotulos';
import { prepararSeriePreco } from '@/dominio/graficos';
import { descreverIndicadores } from '@/dominio/indicadores';
import { useBacktests, useCotacao, useHistorico, useIndicadores, useSinais } from '@/hooks/useAtivo';
import { useDefinirNotificacao, useItemWatchlist, useRemoverWatchlist } from '@/hooks/useWatchlist';
import { espaco } from '@/theme/escala';
import { ehStatus, mensagemDeErro } from '@/utils/erros';
import { formatarMoeda, paraNumero } from '@/utils/formatacao';

const PERIODOS: readonly { valor: PeriodoHistorico; rotulo: string }[] = [
  { valor: '1D', rotulo: '1D' },
  { valor: '1S', rotulo: '1S' },
  { valor: '1M', rotulo: '1M' },
  { valor: '3M', rotulo: '3M' },
  { valor: '1A', rotulo: '1A' },
  { valor: '5A', rotulo: '5A' },
];

export default function DetalheAtivo() {
  const { id, ticker: tickerParam } = useLocalSearchParams<{ id: string; ticker?: string }>();
  const item = useItemWatchlist(id);
  const ativo = item?.ativo;
  const titulo = ativo?.ticker ?? tickerParam ?? 'Ativo';

  const [periodo, setPeriodo] = useState<PeriodoHistorico>('1M');
  const cotacao = useCotacao(id);
  const historico = useHistorico(id, periodo);
  const indicadores = useIndicadores(id);
  const sinais = useSinais(id);
  const backtests = useBacktests(id, sinais.data?.map((sinal) => sinal.regra_id) ?? []);
  const definirNotificacao = useDefinirNotificacao();
  const remover = useRemoverWatchlist();

  const precoAtual = cotacao.data ? paraNumero(cotacao.data.preco) : null;

  function atualizar() {
    void cotacao.refetch();
    void historico.refetch();
    void indicadores.refetch();
    void sinais.refetch();
  }

  function confirmarRemocao() {
    Alert.alert('Remover da watchlist', `Remover ${titulo} da sua watchlist?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          remover.mutate(id, {
            onSuccess: () => router.back(),
            onError: (erro) => Alert.alert('Não foi possível remover', mensagemDeErro(erro)),
          }),
      },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: titulo,
          headerRight: item
            ? () => (
                <BotaoCabecalho
                  icone={item.notificar ? 'sino' : 'sino-desligado'}
                  rotulo={item.notificar ? 'Desativar notificações' : 'Ativar notificações'}
                  onPress={() => {
                    if (definirNotificacao.isPending) return;
                    definirNotificacao.mutate(
                      { ativoId: id, notificar: !item.notificar },
                      { onError: (erro) => Alert.alert('Não foi possível alterar as notificações', mensagemDeErro(erro)) },
                    );
                  }}
                />
              )
            : undefined,
        }}
      />
      <Tela aoAtualizar={atualizar} atualizando={cotacao.isRefetching}>
        <Card>
          {ativo ? (
            <>
              <Texto cor="secundario">{ativo.nome}</Texto>
              <View style={estilos.pills}>
                <Pill tom="azul">{ROTULO_TIPO_ATIVO[ativo.tipo]}</Pill>
                <Pill>{ativo.moeda}</Pill>
              </View>
            </>
          ) : null}
          <EstadoConsulta
            consulta={cotacao}
            mensagemErro={(erro) => (ehStatus(erro, 404) ? 'Sem cotação disponível para este ativo.' : undefined)}
          >
            {(dados) => (
              <>
                <View style={estilos.linhaPreco}>
                  <Texto variante="destaque">{formatarMoeda(dados.preco, ativo?.moeda)}</Texto>
                  <VariacaoBadge valor={dados.variacao_percentual} escala="pontos" />
                </View>
                <Linha rotulo="Máxima do dia" valor={formatarMoeda(dados.maxima_dia, ativo?.moeda)} />
                <Linha rotulo="Mínima do dia" valor={formatarMoeda(dados.minima_dia, ativo?.moeda)} />
              </>
            )}
          </EstadoConsulta>
        </Card>

        <Card titulo="Histórico de fechamento" icone="tendencia">
          <SeletorSegmentado rotulo="Período do gráfico" opcoes={PERIODOS} selecionado={periodo} aoSelecionar={setPeriodo} />
          <EstadoConsulta
            consulta={historico}
            mensagemErro={(erro) => (ehStatus(erro, 404) ? 'Histórico indisponível para este ativo.' : undefined)}
          >
            {(pontos) => {
              const serie = prepararSeriePreco(pontos);
              return serie ? (
                <GraficoPreco serie={serie} moeda={ativo?.moeda} />
              ) : (
                <EstadoVazio mensagem="Dados insuficientes para o gráfico neste período." />
              );
            }}
          </EstadoConsulta>
        </Card>

        <Card titulo="Indicadores técnicos" icone="atividade">
          <EstadoConsulta consulta={indicadores}>
            {(lista) =>
              lista.length === 0 ? (
                <EstadoVazio mensagem="Indicadores ainda não calculados para este ativo." />
              ) : (
                descreverIndicadores(lista, precoAtual).map((indicador) => (
                  <IndicadorItem key={indicador.chave} indicador={indicador} />
                ))
              )
            }
          </EstadoConsulta>
        </Card>

        <Texto variante="subtitulo" role="heading">
          Sinais técnicos ativos
        </Texto>
        <EstadoConsulta consulta={sinais}>
          {(lista) =>
            lista.length === 0 ? (
              <EstadoVazio mensagem="Nenhum sinal técnico ativo no momento." />
            ) : (
              lista.map((sinal, indice) => (
                <SinalCard
                  key={sinal.id}
                  sinal={sinal}
                  backtest={backtests[indice]?.data}
                  carregandoBacktest={backtests[indice]?.isPending ?? true}
                />
              ))
            )
          }
        </EstadoConsulta>

        <CardAnaliseIA />

        {item ? (
          <Botao titulo="Remover da watchlist" variante="perigo" onPress={confirmarRemocao} carregando={remover.isPending} />
        ) : null}
      </Tela>
    </>
  );
}

const estilos = StyleSheet.create({
  pills: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  linhaPreco: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco.md },
});
