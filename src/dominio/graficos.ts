import type { PontoHistorico } from '@/api/tipos';
import type { CoresGrafico } from '@/theme/cores';
import { paraNumero } from '@/utils/formatacao';

// `type` (e não `interface`): o CartesianChart exige dados compatíveis com Record<string, unknown>.
export type PontoGrafico = { indice: number; fechamento: number };

export interface SeriePreco {
  pontos: PontoGrafico[];
  minimo: number;
  maximo: number;
  inicio: string;
  fim: string;
  /** Pontos percentuais entre o primeiro e o último fechamento. */
  variacaoPercentual: number;
}

export function prepararSeriePreco(historico: PontoHistorico[]): SeriePreco | null {
  const validos = [...historico]
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
    .map((ponto) => ({ data: ponto.data, fechamento: paraNumero(ponto.fechamento) }))
    .filter((ponto) => Number.isFinite(ponto.fechamento));

  if (validos.length < 2) return null;

  const valores = validos.map((ponto) => ponto.fechamento);
  const primeiro = valores[0];
  const ultimo = valores[valores.length - 1];

  return {
    pontos: validos.map((ponto, indice) => ({ indice, fechamento: ponto.fechamento })),
    minimo: Math.min(...valores),
    maximo: Math.max(...valores),
    inicio: validos[0].data,
    fim: validos[validos.length - 1].data,
    variacaoPercentual: primeiro === 0 ? 0 : ((ultimo - primeiro) / primeiro) * 100,
  };
}

/** Cor da série de preço: alta (ou zero) em verde, queda em vermelho. */
export function corDaVariacao(variacao: number, grafico: Pick<CoresGrafico, 'alta' | 'baixa'>): string {
  return variacao >= 0 ? grafico.alta : grafico.baixa;
}
