import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { Ativo, CotacaoAtual } from '@/api/tipos';
import { Icone } from '@/components/Icone';
import { Pill } from '@/components/Pill';
import { Texto } from '@/components/Texto';
import { VariacaoBadge } from '@/components/VariacaoBadge';
import { ROTULO_TIPO_ATIVO } from '@/dominio/rotulos';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { formatarMoeda } from '@/utils/formatacao';

export type EstadoCotacao = 'carregando' | 'ok' | 'indisponivel';

interface Props {
  ativo: Ativo;
  cotacao?: CotacaoAtual;
  estadoCotacao: EstadoCotacao;
  aoPressionar: () => void;
  /** Sinais técnicos vigentes: o selo só aparece quando há pelo menos um. */
  sinais?: number;
  /** Estado das notificações do ativo; o sino só aparece com `aoAlternarNotificacao`. */
  notificar?: boolean;
  aoAlternarNotificacao?: () => void;
  /** Há uma alteração de notificação em andamento: o sino fica desabilitado, de forma visível. */
  ocupado?: boolean;
}

export function LinhaAtivo({
  ativo,
  cotacao,
  estadoCotacao,
  aoPressionar,
  sinais = 0,
  notificar = false,
  aoAlternarNotificacao,
  ocupado = false,
}: Props) {
  const { cores, sombras } = useTema();
  return (
    <View
      style={[estilos.linha, { backgroundColor: cores.superficie, borderColor: cores.borda, boxShadow: sombras.sm }]}
    >
      <Pressable
        role="button"
        aria-label={`${ativo.ticker}, ${ativo.nome}`}
        onPress={aoPressionar}
        style={({ pressed }) => [estilos.principal, { opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={estilos.esquerda}>
          <Texto variante="subtitulo">{ativo.ticker}</Texto>
          <Texto variante="legenda" cor="secundario" numberOfLines={1}>
            {`${ROTULO_TIPO_ATIVO[ativo.tipo]} · ${ativo.nome}`}
          </Texto>
          {sinais > 0 ? <Pill tom="amarelo">{`${sinais} ${sinais === 1 ? 'sinal' : 'sinais'}`}</Pill> : null}
        </View>
        <View style={estilos.direita}>
          {estadoCotacao === 'carregando' ? <ActivityIndicator aria-label="Carregando" color={cores.primaria} /> : null}
          {estadoCotacao === 'indisponivel' ? (
            <>
              <Texto negrito>—</Texto>
              <Texto variante="legenda" cor="secundario">
                sem cotação
              </Texto>
            </>
          ) : null}
          {estadoCotacao === 'ok' && cotacao ? (
            <>
              <Texto negrito numerico>
                {formatarMoeda(cotacao.preco, ativo.moeda)}
              </Texto>
              <VariacaoBadge valor={cotacao.variacao_percentual} escala="pontos" />
            </>
          ) : null}
        </View>
      </Pressable>
      {aoAlternarNotificacao ? (
        <Pressable
          role="switch"
          aria-label={`Notificações de ${ativo.ticker}`}
          aria-checked={notificar}
          aria-disabled={ocupado}
          aria-busy={ocupado}
          disabled={ocupado}
          onPress={aoAlternarNotificacao}
          style={[estilos.sino, ocupado ? estilos.sinoOcupado : null]}
        >
          <Icone nome={notificar ? 'sino' : 'sino-desligado'} tamanho={20} cor={notificar ? 'primaria' : 'textoTerciario'} />
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: raio.lg },
  principal: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: espaco.md, padding: espaco.lg },
  esquerda: { flex: 1, gap: 2, alignItems: 'flex-start' },
  direita: { alignItems: 'flex-end', gap: espaco.xs },
  sino: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: espaco.xs },
  sinoOcupado: { opacity: 0.5 },
});
