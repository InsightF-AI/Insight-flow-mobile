import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';

import { ativosApi } from '@/api/ativos';
import type { ApiError } from '@/api/client';
import type { CotacaoAtual, IndicadorTecnico, PeriodoHistorico, PontoHistorico, Sinal, Uuid } from '@/api/tipos';
import { chaves } from '@/hooks/chaves';

// Mesmo TTL do cache Redis de cotação atual no backend.
const VALIDADE_COTACAO_MS = 60_000;
const VALIDADE_BACKTEST_MS = 5 * 60_000;

export function useCotacao(ativoId: Uuid | undefined) {
  return useQuery<CotacaoAtual, ApiError>({
    queryKey: chaves.cotacao(ativoId ?? ''),
    queryFn: () => ativosApi.cotacao(ativoId as Uuid),
    enabled: Boolean(ativoId),
    staleTime: VALIDADE_COTACAO_MS,
  });
}

export function useCotacoes(ativoIds: Uuid[]) {
  return useQueries({
    queries: ativoIds.map((ativoId) => ({
      queryKey: chaves.cotacao(ativoId),
      queryFn: () => ativosApi.cotacao(ativoId),
      staleTime: VALIDADE_COTACAO_MS,
    })),
  });
}

export function useHistorico(ativoId: Uuid, periodo: PeriodoHistorico) {
  return useQuery<PontoHistorico[], ApiError>({
    queryKey: chaves.historico(ativoId, periodo),
    queryFn: () => ativosApi.historico(ativoId, periodo),
    placeholderData: keepPreviousData,
  });
}

export function useIndicadores(ativoId: Uuid) {
  return useQuery<IndicadorTecnico[], ApiError>({
    queryKey: chaves.indicadores(ativoId),
    queryFn: () => ativosApi.indicadores(ativoId),
  });
}

export function useSinais(ativoId: Uuid) {
  return useQuery<Sinal[], ApiError>({ queryKey: chaves.sinais(ativoId), queryFn: () => ativosApi.sinais(ativoId) });
}

export function useBacktests(ativoId: Uuid, regraIds: Uuid[]) {
  return useQueries({
    queries: regraIds.map((regraId) => ({
      queryKey: chaves.backtest(ativoId, regraId),
      queryFn: () => ativosApi.backtest(ativoId, regraId),
      staleTime: VALIDADE_BACKTEST_MS,
    })),
  });
}
