import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';

import { ativosApi } from '@/api/ativos';
import type { ApiError } from '@/api/client';
import type { CotacaoAtual, IndicadorTecnico, PeriodoHistorico, PontoHistorico, Provento, Sinal, Uuid } from '@/api/tipos';
import { chaves } from '@/hooks/chaves';

// Mesmo TTL do cache Redis de cotação atual no backend.
const VALIDADE_COTACAO_MS = 60_000;
const VALIDADE_BACKTEST_MS = 5 * 60_000;
// Os sinais são reavaliados pelo servidor a cada 15 min (5 min para cripto); um minuto evita refazer a cada troca de aba.
const VALIDADE_SINAIS_MS = 60_000;

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

/** `habilitado: false` adia a consulta (o histórico 5A de aquecimento só é pedido depois do período exibido). */
export function useHistorico(ativoId: Uuid, periodo: PeriodoHistorico, opcoes: { habilitado?: boolean } = {}) {
  return useQuery<PontoHistorico[], ApiError>({
    queryKey: chaves.historico(ativoId, periodo),
    queryFn: () => ativosApi.historico(ativoId, periodo),
    placeholderData: keepPreviousData,
    enabled: opcoes.habilitado ?? true,
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

/** `habilitado: false` evita a chamada para ativos que não pagam proventos (cripto e índices). */
export function useDividendos(ativoId: Uuid, habilitado = true) {
  return useQuery<Provento[], ApiError>({
    queryKey: chaves.dividendos(ativoId),
    queryFn: () => ativosApi.dividendos(ativoId),
    enabled: habilitado,
    staleTime: VALIDADE_BACKTEST_MS,
  });
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

/** Sinais vigentes de vários ativos (tela Início). Mesma chave do detalhe: o cache é compartilhado. */
export function useSinaisDosAtivos(ativoIds: Uuid[]) {
  return useQueries({
    queries: ativoIds.map((ativoId) => ({
      queryKey: chaves.sinais(ativoId),
      queryFn: () => ativosApi.sinais(ativoId),
      staleTime: VALIDADE_SINAIS_MS,
    })),
  });
}

/** Backtest de vários pares ativo+regra (tela Início). Mesma chave do detalhe do ativo. */
export function useBacktestsDosSinais(pares: { ativoId: Uuid; regraId: Uuid }[]) {
  return useQueries({
    queries: pares.map(({ ativoId, regraId }) => ({
      queryKey: chaves.backtest(ativoId, regraId),
      queryFn: () => ativosApi.backtest(ativoId, regraId),
      staleTime: VALIDADE_BACKTEST_MS,
    })),
  });
}
