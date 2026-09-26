import type { ReactNode } from 'react';

// Safe area sem nativo: insets zerados e SafeAreaView como View comum.
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: { children: ReactNode }) => children,
    SafeAreaView: View,
    useSafeAreaInsets: () => insets,
  };
});

// SecureStore em memória: os testes inspecionam `__armazenamento` diretamente.
jest.mock('expo-secure-store', () => {
  const armazenamento = new Map<string, string>();
  return {
    __armazenamento: armazenamento,
    getItemAsync: jest.fn(async (chave: string) => armazenamento.get(chave) ?? null),
    setItemAsync: jest.fn(async (chave: string, valor: string) => {
      armazenamento.set(chave, valor);
    }),
    deleteItemAsync: jest.fn(async (chave: string) => {
      armazenamento.delete(chave);
    }),
  };
});
