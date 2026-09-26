import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import type { Alerta } from '@/api/tipos';
import { Texto } from '@/components/Texto';
import { descreverCondicao } from '@/dominio/alerta';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { formatarDataHora } from '@/utils/formatacao';

interface Props {
  alerta: Alerta;
  aoAlternar: (habilitado: boolean) => void;
  aoRemover: () => void;
  ocupado: boolean;
}

export function ItemAlerta({ alerta, aoAlternar, aoRemover, ocupado }: Props) {
  const { cores } = useTema();
  const ticker = alerta.ativo.ticker;
  return (
    <View style={[estilos.item, { backgroundColor: cores.superficie, borderColor: cores.borda }]}>
      <View style={estilos.textos}>
        <Texto negrito>{ticker}</Texto>
        <Texto>{descreverCondicao(alerta.tipo_condicao, alerta.valor_alvo, alerta.moeda_alvo)}</Texto>
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
        trackColor={{ true: cores.primaria, false: cores.borda }}
      />
      <Pressable
        role="button"
        aria-label={`Remover alerta de ${ticker}`}
        aria-disabled={ocupado}
        disabled={ocupado}
        onPress={aoRemover}
        hitSlop={8}
      >
        <Ionicons name="trash-outline" size={20} color={cores.negativo} />
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
