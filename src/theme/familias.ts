/** Nomes das famílias registradas por `carregarFontes.ts`. Sem imports de pacotes: seguro para importar em qualquer teste. */
export const familia = {
  corpo: 'Inter_400Regular',
  medio: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  negrito: 'Inter_700Bold',
  tituloSemi: 'SpaceGrotesk_600SemiBold',
  titulo: 'SpaceGrotesk_700Bold',
} as const;

/** Com erro de carregamento o app abre com a fonte do sistema em vez de ficar preso na splash. */
export function fontesProntas(carregou: boolean, erro: unknown): boolean {
  return carregou || erro != null;
}
