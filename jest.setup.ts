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

// Área de transferência sem nativo: os testes inspecionam `setStringAsync`.
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));

// O VirtualizedList agenda um setTimeout (updateCellsBatchingPeriod, 50 ms) a cada atualização de dados. Se ele dispara
// depois do último `await` do teste e antes do cleanup, o React avisa "not wrapped in act". Este afterEach roda ANTES do
// cleanup automático do RNTL (hooks do mesmo tipo rodam na ordem de declaração e o RNTL só registra o dele quando o teste
// importa a biblioteca, depois deste setup): o timer da lista, agendado antes, vence primeiro e roda dentro do act.
// Por isso este arquivo não pode importar '@testing-library/react-native' no topo; o require é preguiçoso e usa 'pure'.
const PERIODO_DA_LISTA_MS = 60;

function haArvoreRenderizada(): boolean {
  const { screen } = jest.requireActual<typeof import('@testing-library/react-native/pure')>(
    '@testing-library/react-native/pure',
  );
  try {
    return screen.toJSON() !== null;
  } catch {
    return false;
  }
}

afterEach(async () => {
  // Com fake timers o setTimeout abaixo nunca resolveria; esses testes controlam o relógio por conta própria.
  const comFakeTimers = 'clock' in setTimeout || jest.isMockFunction(setTimeout);
  if (comFakeTimers || !haArvoreRenderizada()) return;
  const { act } = jest.requireActual<typeof import('@testing-library/react-native/pure')>(
    '@testing-library/react-native/pure',
  );
  await act(async () => {
    await new Promise<void>((resolver) => setTimeout(resolver, PERIODO_DA_LISTA_MS));
  });
});
