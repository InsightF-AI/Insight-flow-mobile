import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/api/client';
import { notificacoesApi } from '@/api/notificacoes';
import type { Notificacao, Uuid } from '@/api/tipos';
import { contarNaoLidas } from '@/dominio/notificacoes';
import { chaves } from '@/hooks/chaves';
import { useConexaoTempoReal } from '@/store/tempoReal';

// Reserva: o WebSocket entrega em tempo real; este polling só roda enquanto ele não está conectado.
export const INTERVALO_NOTIFICACOES_MS = 60_000;

export function useNotificacoes() {
  const conectado = useConexaoTempoReal((estado) => estado.estado === 'conectado');
  return useQuery<Notificacao[], ApiError>({
    queryKey: chaves.notificacoes,
    queryFn: () => notificacoesApi.listar(),
    refetchInterval: conectado ? false : INTERVALO_NOTIFICACOES_MS,
  });
}

export function useNaoLidas(): number {
  const { data } = useNotificacoes();
  return contarNaoLidas(data);
}

export function useMarcarLida() {
  const queryClient = useQueryClient();
  return useMutation<Notificacao, ApiError, Uuid>({
    mutationFn: (notificacaoId) => notificacoesApi.marcarComoLida(notificacaoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chaves.notificacoes }),
  });
}

/** O backend só marca uma por vez: dispara todas e informa quantas falharam (a lista é relida de qualquer jeito). */
export function useMarcarTodasLidas() {
  const queryClient = useQueryClient();
  return useMutation<{ falhas: number }, ApiError, Uuid[]>({
    mutationFn: async (ids) => {
      const resultados = await Promise.allSettled(ids.map((id) => notificacoesApi.marcarComoLida(id)));
      return { falhas: resultados.filter((resultado) => resultado.status === 'rejected').length };
    },
    onMutate: (ids) => {
      queryClient.setQueryData<Notificacao[]>(chaves.notificacoes, (atual) =>
        atual?.map((notificacao) => (ids.includes(notificacao.id) ? { ...notificacao, lida: true } : notificacao)),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.notificacoes }),
  });
}
