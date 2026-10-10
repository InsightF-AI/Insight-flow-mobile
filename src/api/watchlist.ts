import { request } from '@/api/client';
import type { ItemWatchlist, Uuid } from '@/api/tipos';

export const watchlistApi = {
  listar: () => request<ItemWatchlist[]>('/watchlist'),
  // A primeira inclusão de um ticker cria o ativo e coleta o histórico no servidor: passa dos 20 s do padrão.
  adicionar: (ticker: string) =>
    request<ItemWatchlist>('/watchlist', { metodo: 'POST', corpo: { ticker }, timeoutMs: 30_000 }),
  remover: (ativoId: Uuid) => request<void>(`/watchlist/${ativoId}`, { metodo: 'DELETE' }),
  definirNotificacao: (ativoId: Uuid, notificar: boolean) =>
    request<ItemWatchlist>(`/watchlist/${ativoId}/notificacao`, { metodo: 'PATCH', corpo: { notificar } }),
};
