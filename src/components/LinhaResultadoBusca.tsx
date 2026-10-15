import { Pressable, StyleSheet, View } from 'react-native';

import type { AtivoEncontrado } from '@/api/tipos';
import { Icone } from '@/components/Icone';
import { Texto } from '@/components/Texto';
import { ROTULO_TIPO_ATIVO } from '@/dominio/rotulos';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  ativo: AtivoEncontrado;
  aoPressionar: () => void;
  /** Já está na watchlist: tocar abre o ativo. Fora dela, tocar pede para adicionar. */
  naWatchlist?: boolean;
}

export function LinhaResultadoBusca({ ativo, aoPressionar, naWatchlist = false }: Props) {
  const { cores } = useTema();
  return (
    <Pressable
      role="button"
      aria-label={`${ativo.ticker}, ${ativo.nome}`}
      accessibilityHint={
        naWatchlist ? 'Já está na sua watchlist. Toque para abrir o ativo.' : 'Toque para adicionar à watchlist.'
      }
      onPress={aoPressionar}
      style={({ pressed }) => [estilos.linha, { borderColor: cores.borda, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={estilos.textos}>
        <Texto negrito>{ativo.ticker}</Texto>
        <Texto numberOfLines={1}>{ativo.nome}</Texto>
        <Texto variante="legenda" cor="secundario">{`${ROTULO_TIPO_ATIVO[ativo.tipo]} · ${ativo.moeda}`}</Texto>
      </View>
      <View style={estilos.acao}>
        <Icone nome={naWatchlist ? 'confirmado' : 'mais-circulo'} tamanho={22} cor={naWatchlist ? 'textoSecundario' : 'primaria'} />
        <Texto variante="legenda" cor={naWatchlist ? 'secundario' : 'primaria'}>
          {naWatchlist ? 'Na watchlist' : 'Adicionar à watchlist'}
        </Texto>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingVertical: espaco.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textos: { flex: 1, gap: 2 },
  acao: { alignItems: 'center', gap: 2, maxWidth: 96 },
});
