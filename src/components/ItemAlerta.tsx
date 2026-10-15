import { Pressable, StyleSheet, Switch, View } from 'react-native';

import type { Alerta, Decimal } from '@/api/tipos';
import { Icone } from '@/components/Icone';
import { Texto } from '@/components/Texto';
import { descreverCondicao, descreverDistancia, distanciaAoAlvo } from '@/dominio/alerta';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { formatarDataHora, formatarMoeda } from '@/utils/formatacao';

interface Props {
  alerta: Alerta;
  /** Cotação atual do ativo, quando já carregou. */
  cotacao?: { preco: Decimal } | null;
  /** A cotação falhou ou não existe: mostra "indisponível" em vez de inventar a distância. */
  cotacaoIndisponivel?: boolean;
  aoAlternar: (habilitado: boolean) => void;
  aoRemover: () => void;
  ocupado: boolean;
}

export function ItemAlerta({ alerta, cotacao, cotacaoIndisponivel = false, aoAlternar, aoRemover, ocupado }: Props) {
  const { cores, sombras } = useTema();
  const ticker = alerta.ativo.ticker;
  const distancia = cotacao ? distanciaAoAlvo(alerta.tipo_condicao, cotacao.preco, alerta.valor_alvo) : null;
  return (
    <View style={[estilos.item, { backgroundColor: cores.superficie, borderColor: cores.borda, boxShadow: sombras.sm }]}>
      <View style={estilos.textos}>
        <Texto negrito>{ticker}</Texto>
        <Texto>{descreverCondicao(alerta.tipo_condicao, alerta.valor_alvo, alerta.moeda_alvo)}</Texto>
        {cotacao ? (
          <Texto variante="legenda" cor="secundario" numerico>
            {`Preço atual ${formatarMoeda(cotacao.preco, alerta.moeda_alvo)}`}
          </Texto>
        ) : null}
        {cotacaoIndisponivel && !cotacao ? (
          <Texto variante="legenda" cor="secundario">
            Preço atual indisponível
          </Texto>
        ) : null}
        {distancia ? (
          <Texto variante="legenda" cor="secundario">
            {descreverDistancia(distancia)}
          </Texto>
        ) : null}
        {alerta.disparado_em ? (
          <Texto variante="legenda" cor="alerta">
            {`Disparado em ${formatarDataHora(alerta.disparado_em)}`}
          </Texto>
        ) : null}
      </View>
      <Switch
        role="switch"
        aria-label={`Alerta de ${ticker} habilitado`}
        value={alerta.habilitado}
        onValueChange={aoAlternar}
        disabled={ocupado}
        trackColor={{ true: cores.primaria, false: cores.bordaForte }}
      />
      <Pressable
        role="button"
        aria-label={`Remover alerta de ${ticker}`}
        aria-disabled={ocupado}
        disabled={ocupado}
        onPress={aoRemover}
        hitSlop={12}
      >
        <Icone nome="lixeira" tamanho={20} cor="negativo" />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    padding: espaco.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: raio.lg,
  },
  textos: { flex: 1, gap: 2 },
});
