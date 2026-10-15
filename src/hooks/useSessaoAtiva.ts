import { useBannerNotificacao } from '@/hooks/useBannerNotificacao';
import { useSincronizarPush, useToquesDoPush } from '@/hooks/usePush';
import { useTempoReal } from '@/hooks/useTempoReal';

/** Tudo que fica ligado enquanto há sessão: WebSocket, registro do push, toque no push e banner in-app. */
export function useSessaoAtiva(urlDoWebSocket: string | null) {
  useTempoReal(urlDoWebSocket);
  useSincronizarPush();
  useToquesDoPush();
  return useBannerNotificacao();
}
