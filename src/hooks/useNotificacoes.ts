import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/api/client';
import { notificacoesApi } from '@/api/notificacoes';
import type { Notificacao, Uuid } from '@/api/tipos';
import { chaves } from '@/hooks/chaves';

// Sem push nativo no MVP: a lista é atualizada por polling enquanto o app está em primeiro plano.
export const INTERVALO_NOTIFICACOES_MS = 60_000;

export function useNotificacoes() {
  return useQuery<Notificacao[], ApiError>({
    queryKey: chaves.notificacoes,
    queryFn: () => notificacoesApi.listar(),
    refetchInterval: INTERVALO_NOTIFICACOES_MS,
  });
}

export function useNaoLidas(): number {
  const { data } = useNotificacoes();
  return data?.filter((notificacao) => !notificacao.lida).length ?? 0;
}

export function useMarcarLida() {
  const queryClient = useQueryClient();
  return useMutation<Notificacao, ApiError, Uuid>({
    mutationFn: (notificacaoId) => notificacoesApi.marcarComoLida(notificacaoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chaves.notificacoes }),
  });
}
