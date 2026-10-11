import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { destinoDoPush, lerDadosDoPush } from '@/dominio/push';
import { useMarcarLida } from '@/hooks/useNotificacoes';
import { observarMudancaDeToken, observarToques } from '@/notificacoes/push';
import { usePush } from '@/store/push';

/** Registra o aparelho ao entrar, quando o token muda e quando o app volta com a permissão liberada nas configurações. */
export function useSincronizarPush() {
  useEffect(() => {
    void usePush.getState().sincronizar();

    let ativo = true;
    let cancelarToken: (() => void) | undefined;
    void observarMudancaDeToken(() => void usePush.getState().sincronizar()).then((cancelar) => {
      if (ativo) cancelarToken = cancelar;
      else cancelar();
    });

    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active') return;
      const { situacao } = usePush.getState();
      if (situacao === 'negado' || situacao === 'erro') void usePush.getState().sincronizar();
    });

    return () => {
      ativo = false;
      cancelarToken?.();
      assinatura.remove();
    };
  }, []);
}

/** Toque numa notificação do sistema: marca como lida e abre o ativo (ou o detalhe, ou a caixa). */
export function useToquesDoPush() {
  const { mutate: marcarLida } = useMarcarLida();

  useEffect(() => {
    let ativo = true;
    let cancelar: (() => void) | undefined;
    void observarToques((dados) => {
      const push = lerDadosDoPush(dados);
      if (push.notificacao_id) marcarLida(push.notificacao_id);
      try {
        router.push(destinoDoPush(push));
      } catch {
        // Navegação ainda não montada (partida a frio): a notificação continua na caixa.
      }
    }).then((desfazer) => {
      if (ativo) cancelar = desfazer;
      else desfazer();
    });
    return () => {
      ativo = false;
      cancelar?.();
    };
  }, [marcarLida]);
}
