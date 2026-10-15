import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/api/client';
import type { ItemWatchlist, Uuid } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { chaves } from '@/hooks/chaves';

export function useWatchlist() {
  return useQuery<ItemWatchlist[], ApiError>({ queryKey: chaves.watchlist, queryFn: () => watchlistApi.listar() });
}

export function useItemWatchlist(ativoId: Uuid | undefined): ItemWatchlist | undefined {
  const { data } = useWatchlist();
  return data?.find((item) => item.ativo.id === ativoId);
}

export function useRemoverWatchlist() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, Uuid>({
    mutationFn: (ativoId) => watchlistApi.remover(ativoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chaves.watchlist }),
  });
}

export function useDefinirNotificacao() {
  const queryClient = useQueryClient();
  return useMutation<ItemWatchlist, ApiError, { ativoId: Uuid; notificar: boolean }>({
    mutationFn: ({ ativoId, notificar }) => watchlistApi.definirNotificacao(ativoId, notificar),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chaves.watchlist }),
  });
}
