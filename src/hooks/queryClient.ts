import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';

const MAXIMO_DE_REPETICOES = 2;

/** Repete só falhas transitórias (rede/timeout e 5xx); 4xx nunca se resolve repetindo. */
export function deveRepetir(falhas: number, erro: unknown): boolean {
  if (falhas >= MAXIMO_DE_REPETICOES) return false;
  return erro instanceof ApiError && (erro.status === 0 || erro.status >= 500);
}

export function criarQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: deveRepetir, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
}

export const queryClient = criarQueryClient();
