import type { PontoHistorico } from '@/api/tipos';
import { bollinger, type FaixasBollinger, macd, rsi, type Serie, type SeriesMacd, sma } from '@/dominio/series';

export interface Candle {
  /** `AAAA-MM-DD`, a parte UTC da string do backend (cripto vem 00:00Z; B3, 03:00Z). Nunca convertida de fuso. */
  data: string;
  abertura: number;
  maxima: number;
  minima: number;
  fechamento: number;
  volume: number;
}

/** `Number('')` é 0: texto vazio ou em branco é tratado como ausente, nunca como zero. */
function decimal(texto: string): number {
  return texto.trim() === '' ? Number.NaN : Number(texto);
}

export function prepararCandles(historico: PontoHistorico[]): Candle[] {
  const porData = new Map<string, Candle>();
  for (const ponto of historico) {
    const candle: Candle = {
      data: ponto.data.slice(0, 10),
      abertura: decimal(ponto.abertura),
      maxima: decimal(ponto.maxima),
      minima: decimal(ponto.minima),
      fechamento: decimal(ponto.fechamento),
      volume: decimal(ponto.volume),
    };
    if (![candle.abertura, candle.maxima, candle.minima, candle.fechamento].every(Number.isFinite)) continue;
    if (!Number.isFinite(candle.volume)) candle.volume = 0;
    porData.set(candle.data, candle);
  }
  return [...porData.values()].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
}

export interface AnaliseTecnica {
  candles: Candle[];
  sma20: Serie;
  sma50: Serie;
  sma200: Serie;
  bollinger: FaixasBollinger;
  rsi: Serie;
  macd: SeriesMacd;
}

/** Dias corridos que o aquecimento pode terminar antes do primeiro candle exibido (fins de semana e feriados). */
const FOLGA_MAXIMA_DO_AQUECIMENTO_EM_DIAS = 10;

function diasEntre(anterior: string, posterior: string): number {
  return (Date.parse(`${posterior}T00:00:00Z`) - Date.parse(`${anterior}T00:00:00Z`)) / 86_400_000;
}

/**
 * Séries calculadas sobre o histórico e recortadas para o período exibido. `completo` (histórico 5A) só entrega os
 * candles anteriores ao período, para as médias e o RSI não começarem vazios; os candles exibidos são sempre os de
 * `exibido`. Um aquecimento que termina muito antes do período não é contínuo com ele e é ignorado.
 */
export function prepararAnaliseTecnica(exibido: PontoHistorico[], completo?: PontoHistorico[]): AnaliseTecnica | null {
  const visiveis = prepararCandles(exibido);
  if (visiveis.length < 2) return null;
  const inicio = visiveis[0].data;

  const anteriores = completo ? prepararCandles(completo).filter((candle) => candle.data < inicio) : [];
  const ultimoAnterior = anteriores[anteriores.length - 1];
  const contiguo =
    ultimoAnterior !== undefined && diasEntre(ultimoAnterior.data, inicio) <= FOLGA_MAXIMA_DO_AQUECIMENTO_EM_DIAS;
  const prefixo = contiguo ? anteriores : [];

  const base = [...prefixo, ...visiveis];
  const primeiro = prefixo.length;
  const fechamentos = base.map((candle) => candle.fechamento);
  const recortar = (serie: Serie): Serie => serie.slice(primeiro);
  const faixas = bollinger(fechamentos);
  const seriesMacd = macd(fechamentos);

  return {
    candles: visiveis,
    sma20: recortar(sma(fechamentos, 20)),
    sma50: recortar(sma(fechamentos, 50)),
    sma200: recortar(sma(fechamentos, 200)),
    bollinger: {
      superior: recortar(faixas.superior),
      media: recortar(faixas.media),
      inferior: recortar(faixas.inferior),
    },
    rsi: recortar(rsi(fechamentos)),
    macd: {
      linha: recortar(seriesMacd.linha),
      sinal: recortar(seriesMacd.sinal),
      histograma: recortar(seriesMacd.histograma),
    },
  };
}
