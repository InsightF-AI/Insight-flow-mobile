import { request } from '@/api/client';
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

export const portfolioApi = {
  listarOperacoes: () => request<Operacao[]>('/operacoes'),
  registrarOperacao: (dados: RegistrarOperacaoRequest) =>
    request<Operacao>('/operacoes', { metodo: 'POST', corpo: dados }),
  removerOperacao: (operacaoId: Uuid) => request<void>(`/operacoes/${operacaoId}`, { metodo: 'DELETE' }),
  posicoes: () => request<Posicao[]>('/portfolio/posicoes'),
  rentabilidade: () => request<Rentabilidade>('/portfolio/rentabilidade'),
  benchmark: (benchmark: TipoBenchmark) =>
    request<Comparativo>('/portfolio/benchmark', { query: { benchmark } }),
  distribuicao: () => request<Distribuicao>('/portfolio/distribuicao'),
};
