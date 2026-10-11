import type { Decimal, Distribuicao, ItemWatchlist, Operacao, Posicao, TipoAtivo, Uuid } from '@/api/tipos';
import { ROTULO_CLASSE_CURTO, ROTULO_CLASSE_PLURAL } from '@/dominio/rotulos';
import { paraNumero } from '@/utils/formatacao';

export interface InfoAtivo {
  ticker: string;
  moeda?: string;
  /** Só conhecido para ativos que estão na watchlist. */
  tipo?: TipoAtivo;
}

/** OperacaoResponse só traz ativo_id: o ticker vem das posições e, com moeda e tipo, da watchlist. */
export function mapaAtivos(
  posicoes: Posicao[] | undefined,
  watchlist: ItemWatchlist[] | undefined,
): Map<Uuid, InfoAtivo> {
  const mapa = new Map<Uuid, InfoAtivo>();
  for (const posicao of posicoes ?? []) mapa.set(posicao.ativo_id, { ticker: posicao.ticker });
  for (const item of watchlist ?? []) {
    mapa.set(item.ativo.id, { ticker: item.ativo.ticker, moeda: item.ativo.moeda, tipo: item.ativo.tipo });
  }
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

export type FiltroPosicoes = 'TODAS' | TipoAtivo | 'OUTROS';

const ORDEM_DAS_CLASSES: readonly TipoAtivo[] = ['ACAO', 'FII', 'ETF', 'BDR', 'CRIPTO', 'INDICE'];

function classeDaPosicao(posicao: Posicao, ativos: ReadonlyMap<Uuid, InfoAtivo>): TipoAtivo | 'OUTROS' {
  return ativos.get(posicao.ativo_id)?.tipo ?? 'OUTROS';
}

/**
 * Filtros que valem a pena: só as classes que existem nas posições (e "Outros" para ativos que saíram da watchlist,
 * dos quais o tipo não se conhece). Com uma classe só não há o que filtrar.
 */
export function filtrosDasPosicoes(
  posicoes: readonly Posicao[],
  ativos: ReadonlyMap<Uuid, InfoAtivo>,
): FiltroPosicoes[] {
  const presentes = new Set(posicoes.map((posicao) => classeDaPosicao(posicao, ativos)));
  const filtros: FiltroPosicoes[] = ORDEM_DAS_CLASSES.filter((classe) => presentes.has(classe));
  if (presentes.has('OUTROS')) filtros.push('OUTROS');
  return filtros.length > 1 ? ['TODAS', ...filtros] : ['TODAS'];
}

export function filtrarPosicoes(
  posicoes: readonly Posicao[],
  ativos: ReadonlyMap<Uuid, InfoAtivo>,
  filtro: FiltroPosicoes,
): Posicao[] {
  if (filtro === 'TODAS') return [...posicoes];
  return posicoes.filter((posicao) => classeDaPosicao(posicao, ativos) === filtro);
}

export function rotuloDoFiltro(filtro: FiltroPosicoes): string {
  if (filtro === 'TODAS') return 'Todas';
  if (filtro === 'OUTROS') return 'Outros';
  return ROTULO_CLASSE_CURTO[filtro];
}

const TOLERANCIA_DO_SALDO = 1e-8;

/** Saldo comprado por ativo segundo as operações: COMPRA soma, VENDA subtrai. */
function saldoPorAtivo(operacoes: readonly Operacao[]): Map<Uuid, number> {
  const saldos = new Map<Uuid, number>();
  for (const operacao of operacoes) {
    const quantidade = paraNumero(operacao.quantidade);
    if (!Number.isFinite(quantidade)) continue;
    const sinal = operacao.tipo === 'COMPRA' ? 1 : -1;
    saldos.set(operacao.ativo_id, (saldos.get(operacao.ativo_id) ?? 0) + sinal * quantidade);
  }
  return saldos;
}

/**
 * `/portfolio/posicoes` omite o ativo que não consegue cotar. Ativo com saldo nas operações e sem posição é exatamente
 * isso (posição zerada por venda total não entra: o saldo é zero).
 */
export function ativosSemCotacao(operacoes: readonly Operacao[], posicoes: readonly Posicao[]): Uuid[] {
  const comPosicao = new Set(posicoes.map((posicao) => posicao.ativo_id));
  return [...saldoPorAtivo(operacoes)]
    .filter(([ativoId, saldo]) => saldo > TOLERANCIA_DO_SALDO && !comPosicao.has(ativoId))
    .map(([ativoId]) => ativoId);
}

/** Texto do aviso de dados parciais; null quando nada ficou sem cotação. */
export function descreverDadosParciais(ids: readonly Uuid[], ativos: ReadonlyMap<Uuid, InfoAtivo>): string | null {
  if (ids.length === 0) return null;
  const nomes = ids.map((id) => ativos.get(id)?.ticker).filter((ticker): ticker is string => Boolean(ticker));
  const mostrados = nomes.slice(0, 3);
  const restantes = ids.length - mostrados.length;
  let lista = mostrados.join(', ');
  if (restantes > 0) {
    lista = mostrados.length > 0 ? `${lista} e mais ${restantes}` : `${restantes} ${restantes === 1 ? 'ativo' : 'ativos'}`;
  }
  return `Sem cotação agora para ${lista}: o valor de mercado e o resultado da carteira podem estar incompletos.`;
}

/**
 * Quantidade que dá para vender hoje: o saldo das operações. Não usa `/portfolio/posicoes` porque ela omite o ativo sem
 * cotação, e a venda dele não pode ser bloqueada por falha da fonte de preços.
 */
export function quantidadeDisponivel(operacoes: readonly Operacao[], ativoId: Uuid): number {
  return Math.max(saldoPorAtivo(operacoes).get(ativoId) ?? 0, 0);
}
