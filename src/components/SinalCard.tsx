import { StyleSheet, View } from 'react-native';

import type { Decimal, ResultadoBacktest, Sinal } from '@/api/tipos';
import { Card } from '@/components/Card';
import { Carregando } from '@/components/Carregando';
import { Linha } from '@/components/Linha';
import { Texto } from '@/components/Texto';
import { valorNoDisparo } from '@/dominio/sinais';
import { espaco } from '@/theme/escala';
import { formatarDataHora, formatarPercentual } from '@/utils/formatacao';

interface Props {
  sinal: Sinal;
  backtest?: ResultadoBacktest;
  carregandoBacktest: boolean;
}

function formatarRetorno(valor: Decimal | null): string {
  return valor === null ? 'sem dados' : formatarPercentual(valor, 'pontos');
}

function HistoricoDaCondicao({ backtest, carregando }: { backtest?: ResultadoBacktest; carregando: boolean }) {
  if (carregando) return <Carregando />;
  if (!backtest) {
    return (
      <Texto variante="legenda" cor="secundario">
        Histórico indisponível no momento
      </Texto>
    );
  }
  if (backtest.total_ocorrencias === 0) {
    return (
      <Texto variante="legenda" cor="secundario">
        Sem ocorrências nos últimos 24 meses
      </Texto>
    );
  }
  return (
    <>
      <Linha rotulo="Ocorrências" valor={String(backtest.total_ocorrencias)} />
      <Linha rotulo="Retorno médio em 5 pregões" valor={formatarRetorno(backtest.retorno_medio_5_pregoes)} />
      <Linha rotulo="Retorno médio em 20 pregões" valor={formatarRetorno(backtest.retorno_medio_20_pregoes)} />
      <Linha rotulo="Retorno médio em 60 pregões" valor={formatarRetorno(backtest.retorno_medio_60_pregoes)} />
    </>
  );
}

export function SinalCard({ sinal, backtest, carregandoBacktest }: Props) {
  const disparo = valorNoDisparo(sinal);
  return (
    <Card titulo={sinal.regra_nome} icone="atividade" tomIcone="positivo">
      <Texto cor="secundario">{sinal.regra_descricao}</Texto>
      <Texto variante="legenda" cor="secundario">
        {`Ativo desde ${formatarDataHora(sinal.data_ativacao)}`}
      </Texto>
      {disparo ? <Linha rotulo={`${disparo.rotulo} no disparo`} valor={disparo.valor} /> : null}
      <View style={estilos.historico}>
        <Texto variante="legenda" negrito>
          Histórico da condição (24 meses)
        </Texto>
        <HistoricoDaCondicao backtest={backtest} carregando={carregandoBacktest} />
      </View>
    </Card>
  );
}

const estilos = StyleSheet.create({
  historico: { gap: espaco.sm },
});
