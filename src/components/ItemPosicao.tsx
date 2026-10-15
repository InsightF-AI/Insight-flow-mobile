import { Pressable, StyleSheet, View } from 'react-native';

import type { Decimal, Posicao } from '@/api/tipos';
import { Texto } from '@/components/Texto';
import { VariacaoBadge } from '@/components/VariacaoBadge';
import { espaco } from '@/theme/escala';
import { formatarMoeda, formatarQuantidade, paraNumero } from '@/utils/formatacao';

interface Props {
  posicao: Posicao;
  moeda?: string;
  /** Variação do dia do ativo em pontos percentuais: `undefined` = carregando, `null` = indisponível. */
  variacaoDoDia?: Decimal | null;
  aoPressionar?: () => void;
}

export function ItemPosicao({ posicao, moeda, variacaoDoDia, aoPressionar }: Props) {
  const lucro = paraNumero(posicao.lucro_nao_realizado);
  const corLucro = lucro > 0 ? 'positivo' : lucro < 0 ? 'negativo' : 'secundario';

  const conteudo = (
    <View style={estilos.linha}>
      <View style={estilos.esquerda}>
        <Texto negrito>{posicao.ticker}</Texto>
        <Texto variante="legenda" cor="secundario">
          {`${formatarQuantidade(posicao.quantidade)} × PM ${formatarMoeda(posicao.preco_medio, moeda)}`}
        </Texto>
      </View>
      <View style={estilos.direita}>
        <Texto negrito numerico>
          {formatarMoeda(posicao.valor_mercado_brl, 'BRL')}
        </Texto>
        <Texto variante="legenda" cor={corLucro} numerico>
          {`${lucro > 0 ? '+' : ''}${formatarMoeda(posicao.lucro_nao_realizado, moeda)}`}
        </Texto>
        {variacaoDoDia === null ? (
          <Texto variante="legenda" cor="secundario">
            Hoje —
          </Texto>
        ) : variacaoDoDia !== undefined ? (
          <VariacaoBadge valor={variacaoDoDia} escala="pontos" />
        ) : null}
      </View>
    </View>
  );

  if (!aoPressionar) return conteudo;
  return (
    <Pressable role="button" onPress={aoPressionar} style={estilos.alvo}>
      {conteudo}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  esquerda: { flex: 1, gap: 2 },
  direita: { alignItems: 'flex-end', gap: 2 },
  alvo: { minHeight: 44, justifyContent: 'center' },
});
