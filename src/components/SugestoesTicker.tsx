import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  tickers: string[];
  aoEscolher: (ticker: string) => void;
}

export function SugestoesTicker({ tickers, aoEscolher }: Props) {
  const { cores, tons } = useTema();
  if (tickers.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={estilos.lista}
    >
      {tickers.map((ticker) => (
        <Pressable
          key={ticker}
          role="button"
          aria-label={`Usar ${ticker}`}
          hitSlop={8}
          onPress={() => aoEscolher(ticker)}
          style={[estilos.chip, { borderColor: cores.primaria, backgroundColor: tons.azulFundo }]}
        >
          <Texto variante="legenda" negrito cor="primaria">
            {ticker}
          </Texto>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  lista: { gap: espaco.sm },
  chip: { borderWidth: 1, borderRadius: raio.pilula, paddingHorizontal: espaco.md, paddingVertical: espaco.xs },
});
