import { request } from '@/api/client';
import type {
  AtivoEncontrado,
  CotacaoAtual,
  IndicadorTecnico,
  PeriodoHistorico,
  PontoHistorico,
  ResultadoBacktest,
  Sinal,
  Uuid,
} from '@/api/tipos';

export const ativosApi = {
  buscar: (termo: string) => request<AtivoEncontrado[]>('/ativos/buscar', { query: { termo } }),
  cotacao: (ativoId: Uuid) => request<CotacaoAtual>(`/ativos/${ativoId}/cotacao`),
  historico: (ativoId: Uuid, periodo: PeriodoHistorico) =>
    request<PontoHistorico[]>(`/ativos/${ativoId}/historico`, { query: { periodo } }),
  indicadores: (ativoId: Uuid) => request<IndicadorTecnico[]>(`/ativos/${ativoId}/indicadores`),
  sinais: (ativoId: Uuid) => request<Sinal[]>(`/ativos/${ativoId}/sinais`),
  backtest: (ativoId: Uuid, regraId: Uuid) =>
    request<ResultadoBacktest>(`/ativos/${ativoId}/sinais/${regraId}/backtest`),
};
