import { request } from '@/api/client';
import type { ItemWatchlist, Uuid } from '@/api/tipos';

export const watchlistApi = {
  listar: () => request<ItemWatchlist[]>('/watchlist'),
  adicionar: (ticker: string) => request<ItemWatchlist>('/watchlist', { metodo: 'POST', corpo: { ticker } }),
  remover: (ativoId: Uuid) => request<void>(`/watchlist/${ativoId}`, { metodo: 'DELETE' }),
  definirNotificacao: (ativoId: Uuid, notificar: boolean) =>
    request<ItemWatchlist>(`/watchlist/${ativoId}/notificacao`, { metodo: 'PATCH', corpo: { notificar } }),
};
