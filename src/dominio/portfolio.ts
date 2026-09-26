import type { Decimal, Distribuicao, ItemWatchlist, Posicao, TipoAtivo, Uuid } from '@/api/tipos';
import { ROTULO_CLASSE_PLURAL } from '@/dominio/rotulos';
import { paraNumero } from '@/utils/formatacao';

export interface InfoAtivo {
  ticker: string;
  moeda?: string;
}

/** OperacaoResponse só traz ativo_id: o ticker vem das posições e, com moeda, da watchlist. */
export function mapaAtivos(
  posicoes: Posicao[] | undefined,
  watchlist: ItemWatchlist[] | undefined,
): Map<Uuid, InfoAtivo> {
  const mapa = new Map<Uuid, InfoAtivo>();
  for (const posicao of posicoes ?? []) mapa.set(posicao.ativo_id, { ticker: posicao.ticker });
  for (const item of watchlist ?? []) mapa.set(item.ativo.id, { ticker: item.ativo.ticker, moeda: item.ativo.moeda });
  return mapa;
}

export type DimensaoDistribuicao = 'classe' | 'setor' | 'moeda';

// `type` (e não `interface`): o PolarChart exige dados compatíveis com Record<string, unknown>.
export type FatiaDistribuicao = { rotulo: string; valor: number; cor: string };

function rotuloDaFatia(dimensao: DimensaoDistribuicao, chave: string): string {
  if (dimensao === 'classe') return ROTULO_CLASSE_PLURAL[chave as TipoAtivo] ?? chave;
  if (dimensao === 'setor' && chave === 'N/A') return 'Sem setor';
  return chave;
}

export function prepararDistribuicao(
  distribuicao: Distribuicao,
  dimensao: DimensaoDistribuicao,
  paleta: readonly string[],
): FatiaDistribuicao[] {
  const bruto: Record<string, Decimal> =
    dimensao === 'classe' ? distribuicao.por_classe : dimensao === 'setor' ? distribuicao.por_setor : distribuicao.por_moeda;

  return Object.entries(bruto)
    .map(([chave, valor]) => ({ rotulo: rotuloDaFatia(dimensao, chave), valor: paraNumero(valor) }))
    .filter((fatia) => fatia.valor > 0)
    .sort((a, b) => b.valor - a.valor)
    .map((fatia, indice) => ({ ...fatia, cor: paleta[indice % paleta.length] }));
}
