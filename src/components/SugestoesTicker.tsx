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
      testID="sugestoes-ticker"
      // `flexGrow: 0`: o ScrollView horizontal vem com `flexGrow: 1` e, num formulário curto, cresceria na vertical
      // e esticaria os chips.
      style={estilos.rolagem}
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
  rolagem: { flexGrow: 0 },
  lista: { gap: espaco.sm },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: raio.pilula,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.xs,
  },
});
