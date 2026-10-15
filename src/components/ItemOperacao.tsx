import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Operacao } from '@/api/tipos';
import { Texto } from '@/components/Texto';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { formatarData, formatarMoeda, formatarQuantidade, paraNumero } from '@/utils/formatacao';

interface Props {
  operacao: Operacao;
  ticker: string | null;
  moeda?: string;
  aoRemover: () => void;
  removendo: boolean;
}

// "Compra"/"Venda" aqui é o tipo da operação simulada que o próprio usuário registrou (permitido pela RN-01).
const ROTULO_TIPO = { COMPRA: 'Compra', VENDA: 'Venda' } as const;

export function ItemOperacao({ operacao, ticker, moeda, aoRemover, removendo }: Props) {
  const { cores } = useTema();
  const rotuloTipo = ROTULO_TIPO[operacao.tipo];
  const nomeAtivo = ticker ?? 'Ativo';
  const data = formatarData(operacao.data);
  const total = paraNumero(operacao.quantidade) * paraNumero(operacao.preco_unitario);

  return (
    <View style={estilos.linha}>
      <View style={estilos.esquerda}>
        <Texto negrito>{`${rotuloTipo} · ${nomeAtivo}`}</Texto>
        <Texto variante="legenda" cor="secundario">
          {`${data} · ${formatarQuantidade(operacao.quantidade)} × ${formatarMoeda(operacao.preco_unitario, moeda)}`}
        </Texto>
      </View>
      <Texto negrito>{formatarMoeda(total, moeda)}</Texto>
      <Pressable
        role="button"
        aria-label={`Remover operação de ${rotuloTipo.toLowerCase()} de ${nomeAtivo} em ${data}`}
        aria-disabled={removendo}
        disabled={removendo}
        onPress={aoRemover}
        hitSlop={8}
      >
        <Ionicons name="trash-outline" size={20} color={cores.negativo} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  esquerda: { flex: 1, gap: 2 },
});
