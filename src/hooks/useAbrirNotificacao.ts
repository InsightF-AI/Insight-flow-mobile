import { router } from 'expo-router';

import type { Notificacao } from '@/api/tipos';
import { destinoDaNotificacao } from '@/dominio/notificacoes';
import { mapaAtivos } from '@/dominio/portfolio';
import { useMarcarLida } from '@/hooks/useNotificacoes';
import { useWatchlist } from '@/hooks/useWatchlist';

/** Toque numa notificação (na caixa ou no banner): marca como lida e abre o ativo ou o detalhe. */
export function useAbrirNotificacao(): (notificacao: Notificacao) => void {
  const marcarLida = useMarcarLida();
  const watchlist = useWatchlist();
  return (notificacao) => {
    if (!notificacao.lida) marcarLida.mutate(notificacao.id);
    const ticker = notificacao.ativo_id
      ? mapaAtivos(undefined, watchlist.data).get(notificacao.ativo_id)?.ticker
      : undefined;
    router.push(destinoDaNotificacao(notificacao, ticker));
  };
}
