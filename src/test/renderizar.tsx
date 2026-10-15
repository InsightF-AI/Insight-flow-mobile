import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
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
