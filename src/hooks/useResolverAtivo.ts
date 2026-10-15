import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/api/client';
import { watchlistApi } from '@/api/watchlist';
import { type AtivoResolvido, resolverAtivoId } from '@/dominio/resolverAtivoId';
import { chaves } from '@/hooks/chaves';

export function useResolverAtivo() {
  const queryClient = useQueryClient();
  return useMutation<AtivoResolvido, ApiError, string>({
    mutationFn: (ticker) =>
      resolverAtivoId(ticker, {
        listarWatchlist: () => watchlistApi.listar(),
        adicionarWatchlist: (alvo) => watchlistApi.adicionar(alvo),
      }),
    onSuccess: async (resultado) => {
      if (resultado.adicionouNaWatchlist) await queryClient.invalidateQueries({ queryKey: chaves.watchlist });
    },
  });
}
