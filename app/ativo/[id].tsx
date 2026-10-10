import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import type { PeriodoHistorico } from '@/api/tipos';
import { Botao } from '@/components/Botao';
import { BotaoCabecalho } from '@/components/BotaoCabecalho';
import { Card } from '@/components/Card';
import { CardAnaliseIA } from '@/components/CardAnaliseIA';
import { Carregando } from '@/components/Carregando';
import { EstadoConsulta } from '@/components/EstadoConsulta';
import { EstadoVazio } from '@/components/EstadoVazio';
import { IndicadorItem } from '@/components/IndicadorItem';
import { Linha } from '@/components/Linha';
import { PainelTecnico } from '@/components/PainelTecnico';
import { Pill } from '@/components/Pill';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';
import { SinalCard } from '@/components/SinalCard';
import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { VariacaoBadge } from '@/components/VariacaoBadge';
import { prepararAnaliseTecnica } from '@/dominio/candles';
import { descreverIndicadores } from '@/dominio/indicadores';
import { ROTULO_TIPO_ATIVO } from '@/dominio/rotulos';
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
  // Médias e RSI precisam de registros anteriores ao período: o histórico 5A (o máximo do backend) aquece o cálculo.
  // Corre em paralelo e não bloqueia o gráfico; sem ele as séries só começam mais tarde. 1D e 5A não precisam dele.
  const precisaAquecimento = periodo !== '1D' && periodo !== '5A';
  const aquecimento = useHistorico(id, '5A', { habilitado: precisaAquecimento });
  // Trocar de período mantém o gráfico anterior até a resposta chegar: não o apresenta como se fosse o novo período.
  const trocandoPeriodo = historico.isPlaceholderData;
  // No período 5A o próprio histórico é o completo. RSI e MACD só aparecem com o histórico anterior ao período.
  const historicoCompleto = precisaAquecimento ? aquecimento.data : historico.data;
  const analise = useMemo(
    () => (historico.data && !trocandoPeriodo ? prepararAnaliseTecnica(historico.data, historicoCompleto) : null),
    [historico.data, trocandoPeriodo, historicoCompleto],
  );
  const indicadores = useIndicadores(id);
  const sinais = useSinais(id);
  const backtests = useBacktests(id, sinais.data?.map((sinal) => sinal.regra_id) ?? []);
  const definirNotificacao = useDefinirNotificacao();
  const remover = useRemoverWatchlist();

  const precoAtual = cotacao.data ? paraNumero(cotacao.data.preco) : null;

  function atualizar() {
    void cotacao.refetch();
    void historico.refetch();
    if (precisaAquecimento) void aquecimento.refetch();
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

        <Card titulo="Gráfico técnico" icone="tendencia">
          <SeletorSegmentado rotulo="Período do gráfico" opcoes={PERIODOS} selecionado={periodo} aoSelecionar={setPeriodo} />
          {trocandoPeriodo ? (
            <Carregando />
          ) : (
            <EstadoConsulta
              consulta={historico}
              mensagemErro={(erro) => (ehStatus(erro, 404) ? 'Histórico indisponível para este ativo.' : undefined)}
            >
              {() =>
                analise ? (
                  <PainelTecnico key={periodo} analise={analise} moeda={ativo?.moeda} />
                ) : (
                  <EstadoVazio
                    mensagem={
                      periodo === '1D'
                        ? '1D mostra só a cotação atual (um ponto). Escolha 1S ou mais para ver os candles.'
                        : 'Dados insuficientes para o gráfico neste período.'
                    }
                  />
                )
              }
            </EstadoConsulta>
          )}
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
