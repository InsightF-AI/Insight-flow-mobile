import { Pressable, StyleSheet, Switch, View } from 'react-native';

import type { Alerta } from '@/api/tipos';
import { Icone } from '@/components/Icone';
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
  const { cores, sombras } = useTema();
  const ticker = alerta.ativo.ticker;
  return (
    <View style={[estilos.item, { backgroundColor: cores.superficie, borderColor: cores.borda, boxShadow: sombras.sm }]}>
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
