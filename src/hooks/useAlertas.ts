import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { alertasApi } from '@/api/alertas';
import type { ApiError } from '@/api/client';
import type { Alerta, AtualizarAlertaRequest, CriarAlertaRequest, Uuid } from '@/api/tipos';
import { chaves } from '@/hooks/chaves';

function useInvalidarAlertas() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: chaves.alertas });
}

export function useAlertas() {
  return useQuery<Alerta[], ApiError>({ queryKey: chaves.alertas, queryFn: () => alertasApi.listar() });
}

export function useCriarAlerta() {
  const invalidar = useInvalidarAlertas();
  return useMutation<Alerta, ApiError, CriarAlertaRequest>({
    mutationFn: (dados) => alertasApi.criar(dados),
    onSuccess: () => invalidar(),
  });
}

export function useAtualizarAlerta() {
  const invalidar = useInvalidarAlertas();
  return useMutation<Alerta, ApiError, { id: Uuid; dados: AtualizarAlertaRequest }>({
    mutationFn: ({ id, dados }) => alertasApi.atualizar(id, dados),
    onSuccess: () => invalidar(),
  });
}

export function useRemoverAlerta() {
  const invalidar = useInvalidarAlertas();
  return useMutation<void, ApiError, Uuid>({
    mutationFn: (alertaId) => alertasApi.remover(alertaId),
    onSuccess: () => invalidar(),
  });
}
