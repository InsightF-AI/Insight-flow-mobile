import { StyleSheet, View } from 'react-native';

import type { Posicao } from '@/api/tipos';
import { Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';
import { formatarMoeda, formatarQuantidade, paraNumero } from '@/utils/formatacao';

interface Props {
  posicao: Posicao;
  moeda?: string;
}

export function ItemPosicao({ posicao, moeda }: Props) {
  const lucro = paraNumero(posicao.lucro_nao_realizado);
  const corLucro = lucro > 0 ? 'positivo' : lucro < 0 ? 'negativo' : 'secundario';
  return (
    <View style={estilos.linha}>
      <View style={estilos.esquerda}>
        <Texto negrito>{posicao.ticker}</Texto>
        <Texto variante="legenda" cor="secundario">
          {`${formatarQuantidade(posicao.quantidade)} × PM ${formatarMoeda(posicao.preco_medio, moeda)}`}
        </Texto>
      </View>
      <View style={estilos.direita}>
        <Texto negrito>{formatarMoeda(posicao.valor_mercado_brl, 'BRL')}</Texto>
        <Texto variante="legenda" cor={corLucro}>
          {`${lucro > 0 ? '+' : ''}${formatarMoeda(posicao.lucro_nao_realizado, moeda)}`}
        </Texto>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  esquerda: { flex: 1, gap: 2 },
  direita: { alignItems: 'flex-end', gap: 2 },
});
