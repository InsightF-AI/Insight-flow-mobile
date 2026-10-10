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
  return useMutation<
    ItemWatchlist,
    ApiError,
    { ativoId: Uuid; notificar: boolean },
    { anterior: ItemWatchlist[] | undefined }
  >({
    mutationFn: ({ ativoId, notificar }) => watchlistApi.definirNotificacao(ativoId, notificar),
    // Atualização otimista: o sino muda na hora e volta ao estado anterior se o servidor recusar.
    onMutate: async ({ ativoId, notificar }) => {
      await queryClient.cancelQueries({ queryKey: chaves.watchlist });
      const anterior = queryClient.getQueryData<ItemWatchlist[]>(chaves.watchlist);
      queryClient.setQueryData<ItemWatchlist[]>(chaves.watchlist, (itens) =>
        itens?.map((item) => (item.ativo.id === ativoId ? { ...item, notificar } : item)),
      );
      return { anterior };
    },
    onError: (_erro, _variaveis, contexto) => {
      if (contexto?.anterior) queryClient.setQueryData(chaves.watchlist, contexto.anterior);
    },
    // Sem `return`: a mutation termina com a resposta do PATCH; a lista é conferida com o servidor em segundo plano.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.watchlist });
    },
  });
}
