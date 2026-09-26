import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';

import { familia } from '@/theme/familias';

/** Argumento de `useFonts` (só o layout raiz importa este arquivo). */
export const FONTES = {
  [familia.corpo]: Inter_400Regular,
  [familia.medio]: Inter_500Medium,
  [familia.semibold]: Inter_600SemiBold,
  [familia.negrito]: Inter_700Bold,
  [familia.tituloSemi]: SpaceGrotesk_600SemiBold,
  [familia.titulo]: SpaceGrotesk_700Bold,
};
