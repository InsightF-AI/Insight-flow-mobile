import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { ApiError } from '@/api/client';
import { iaApi } from '@/api/ia';
import type { AnaliseIA, Uuid } from '@/api/tipos';
import { chaves } from '@/hooks/chaves';

/**
 * Análise por IA sob demanda. Cada chamada gasta cota do provedor, então a consulta fica desligada: só `gerar` a
 * dispara (primeira vez e "Atualizar"), sem repetição automática. Voltar à tela dentro do tempo de cache mostra a
 * última análise sem nova chamada.
 */
export function useAnaliseIA(ativoId: Uuid | undefined) {
  const consulta = useQuery<AnaliseIA, ApiError>({
    queryKey: chaves.analiseIA(ativoId ?? ''),
    queryFn: () => iaApi.analisar(ativoId as Uuid),
    enabled: false,
    retry: false,
  });
  const { refetch } = consulta;

  const gerar = useCallback(() => {
    if (ativoId) void refetch();
  }, [ativoId, refetch]);

  return { analise: consulta.data, gerando: consulta.isFetching, erro: consulta.error, gerar };
}
