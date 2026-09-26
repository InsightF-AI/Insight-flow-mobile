import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

export function criarQueryClientDeTeste(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      // gcTime infinito também nas mutations: o padrão (5 min) deixa um timer aberto e o Jest não encerra.
      mutations: { retry: false, gcTime: Infinity },
    },
  });
}

export function criarProvedor(queryClient: QueryClient = criarQueryClientDeTeste()) {
  return function ProvedorConsultas({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

export function renderizar(ui: ReactElement, queryClient: QueryClient = criarQueryClientDeTeste()) {
  return render(ui, { wrapper: criarProvedor(queryClient) });
}

// O VirtualizedList agenda um setTimeout (updateCellsBatchingPeriod, 50 ms) a cada atualização de dados. Se ele dispara
// depois do último `await` do teste e antes do cleanup, o React avisa "not wrapped in act". Chame no fim de todo teste
// que renderiza uma FlatList: o timer da lista, agendado antes, vence primeiro (timers disparam por ordem de vencimento)
// e roda dentro do act. Depois disso não sobra nada pendente, e o cleanup desmonta a lista e limpa qualquer timer novo.
const PERIODO_DA_LISTA_MS = 60;

export async function assentarLista(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolver) => setTimeout(resolver, PERIODO_DA_LISTA_MS));
  });
}
