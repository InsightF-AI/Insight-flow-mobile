import { useEffect } from 'react';

import { tituloDaNotificacao } from '@/dominio/notificacoes';
import { useAbrirNotificacao } from '@/hooks/useAbrirNotificacao';
import { useBanner } from '@/store/banner';

export const DURACAO_DO_BANNER_MS = 6_000;

/** Dados e ações do banner in-app: some sozinho e, ao toque, abre a notificação (marcando como lida). */
export function useBannerNotificacao() {
  const atual = useBanner((estado) => estado.atual);
  const dispensar = useBanner((estado) => estado.dispensar);
  const abrir = useAbrirNotificacao();
  const chave = atual?.chave ?? null;

  useEffect(() => {
    if (chave === null) return;
    const temporizador = setTimeout(dispensar, DURACAO_DO_BANNER_MS);
    return () => clearTimeout(temporizador);
  }, [chave, dispensar]);

  return {
    banner: atual
      ? { titulo: tituloDaNotificacao(atual.notificacao, atual.ticker), mensagem: atual.notificacao.mensagem }
      : null,
    aoPressionar: () => {
      if (!atual) return;
      dispensar();
      abrir(atual.notificacao);
    },
    aoDispensar: dispensar,
  };
}
