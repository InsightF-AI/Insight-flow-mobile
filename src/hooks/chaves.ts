import type { PeriodoHistorico, TipoBenchmark, Uuid } from '@/api/tipos';

export const chaves = {
  watchlist: ['watchlist'] as const,
  cotacao: (ativoId: Uuid) => ['ativo', ativoId, 'cotacao'] as const,
  historico: (ativoId: Uuid, periodo: PeriodoHistorico) => ['ativo', ativoId, 'historico', periodo] as const,
  indicadores: (ativoId: Uuid) => ['ativo', ativoId, 'indicadores'] as const,
  sinais: (ativoId: Uuid) => ['ativo', ativoId, 'sinais'] as const,
  backtest: (ativoId: Uuid, regraId: Uuid) => ['ativo', ativoId, 'backtest', regraId] as const,
  dividendos: (ativoId: Uuid) => ['ativo', ativoId, 'dividendos'] as const,
  busca: (termo: string) => ['busca', termo] as const,
  analiseIA: (ativoId: Uuid) => ['ia', 'analise', ativoId] as const,
  alertas: ['alertas'] as const,
  notificacoes: ['notificacoes'] as const,
  operacoes: ['operacoes'] as const,
  portfolio: ['portfolio'] as const,
  posicoes: ['portfolio', 'posicoes'] as const,
  rentabilidade: ['portfolio', 'rentabilidade'] as const,
  distribuicao: ['portfolio', 'distribuicao'] as const,
  dividendosRecebidos: ['portfolio', 'dividendos'] as const,
  benchmark: (benchmark: TipoBenchmark) => ['portfolio', 'benchmark', benchmark] as const,
};
