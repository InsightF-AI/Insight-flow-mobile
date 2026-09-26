import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/api/client';
import { portfolioApi } from '@/api/portfolio';
import type {
  Comparativo,
  Distribuicao,
  Operacao,
  Posicao,
  RegistrarOperacaoRequest,
  Rentabilidade,
  TipoBenchmark,
  Uuid,
} from '@/api/tipos';
import { chaves } from '@/hooks/chaves';

function useInvalidarCarteira() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: chaves.operacoes }),
      queryClient.invalidateQueries({ queryKey: chaves.portfolio }),
    ]);
}

export function useOperacoes() {
  return useQuery<Operacao[], ApiError>({ queryKey: chaves.operacoes, queryFn: () => portfolioApi.listarOperacoes() });
}

export function usePosicoes() {
  return useQuery<Posicao[], ApiError>({ queryKey: chaves.posicoes, queryFn: () => portfolioApi.posicoes() });
}

export function useRentabilidade() {
  return useQuery<Rentabilidade, ApiError>({ queryKey: chaves.rentabilidade, queryFn: () => portfolioApi.rentabilidade() });
}

export function useDistribuicao() {
  return useQuery<Distribuicao, ApiError>({ queryKey: chaves.distribuicao, queryFn: () => portfolioApi.distribuicao() });
}

export function useBenchmark(benchmark: TipoBenchmark) {
  return useQuery<Comparativo, ApiError>({
    queryKey: chaves.benchmark(benchmark),
    queryFn: () => portfolioApi.benchmark(benchmark),
  });
}

export function useRegistrarOperacao() {
  const invalidar = useInvalidarCarteira();
  return useMutation<Operacao, ApiError, RegistrarOperacaoRequest>({
    mutationFn: (dados) => portfolioApi.registrarOperacao(dados),
    onSuccess: () => invalidar(),
  });
}

export function useRemoverOperacao() {
  const invalidar = useInvalidarCarteira();
  return useMutation<void, ApiError, Uuid>({
    mutationFn: (operacaoId) => portfolioApi.removerOperacao(operacaoId),
    onSuccess: () => invalidar(),
  });
}
