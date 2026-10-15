import type { CriarAlertaRequest, Decimal, TipoCondicaoAlerta } from '@/api/tipos';
import { formatarMoeda, formatarNumero, normalizarDecimal } from '@/utils/formatacao';

export const ROTULO_CONDICAO: Record<TipoCondicaoAlerta, string> = {
  PRECO_MAIOR_IGUAL: 'Preço ≥',
  PRECO_MENOR_IGUAL: 'Preço ≤',
};

export function descreverCondicao(tipo: TipoCondicaoAlerta, valorAlvo: Decimal, moeda: string): string {
  return `${ROTULO_CONDICAO[tipo]} ${formatarMoeda(valorAlvo, moeda)}`;
}

export interface FormAlerta {
  ticker: string;
  tipoCondicao: TipoCondicaoAlerta;
  valorAlvo: string;
}

export type ErrosAlerta = Partial<Record<'ticker' | 'valorAlvo', string>>;

export type ResultadoValidacaoAlerta = { ok: true; dados: CriarAlertaRequest } | { ok: false; erros: ErrosAlerta };

// Mesmo limite do CriarAlertaRequest do backend.
const TICKER_MAXIMO = 20;

export function validarAlerta(form: FormAlerta): ResultadoValidacaoAlerta {
  const erros: ErrosAlerta = {};
  const ticker = form.ticker.trim().toUpperCase();
  if (!ticker) erros.ticker = 'Informe o ticker do ativo';
  else if (ticker.length > TICKER_MAXIMO) erros.ticker = 'Use no máximo 20 caracteres';

  const valor = normalizarDecimal(form.valorAlvo);
  if (valor === null || Number(valor) <= 0) erros.valorAlvo = 'Informe um valor maior que zero';

  if (erros.ticker || erros.valorAlvo || valor === null) return { ok: false, erros };
  return { ok: true, dados: { ticker, tipo_condicao: form.tipoCondicao, valor_alvo: valor } };
}

export interface DistanciaAoAlvo {
  atingido: boolean;
  /** Quanto o preço ainda precisa andar, em % do preço atual (0 quando o alvo já foi alcançado). */
  faltaPercentual: number;
}

/** Distância do preço atual ao alvo do alerta. `null` sem preço utilizável. */
export function distanciaAoAlvo(
  tipo: TipoCondicaoAlerta,
  preco: Decimal | number,
  alvo: Decimal | number,
): DistanciaAoAlvo | null {
  // `Number('')` é 0: texto em branco é ausência de preço, não zero.
  if (typeof preco === 'string' && preco.trim() === '') return null;
  const atual = Number(preco);
  const valorAlvo = Number(alvo);
  if (!Number.isFinite(atual) || !Number.isFinite(valorAlvo) || atual <= 0) return null;
  const atingido = tipo === 'PRECO_MAIOR_IGUAL' ? atual >= valorAlvo : atual <= valorAlvo;
  if (atingido) return { atingido: true, faltaPercentual: 0 };
  const falta = tipo === 'PRECO_MAIOR_IGUAL' ? valorAlvo - atual : atual - valorAlvo;
  return { atingido: false, faltaPercentual: (falta / atual) * 100 };
}

export function descreverDistancia(distancia: DistanciaAoAlvo): string {
  return distancia.atingido ? 'Alvo atingido' : `Faltam ${formatarNumero(distancia.faltaPercentual)}% para o alvo`;
}
