import type { DataISO, Decimal } from '@/api/tipos';

export type EscalaPercentual = 'pontos' | 'fracao';

type Numerico = Decimal | number;

export function paraNumero(valor: Numerico): number {
  return typeof valor === 'number' ? valor : Number(valor);
}

const formatadoresDecimais = new Map<number, Intl.NumberFormat>();

function formatadorDecimal(casas: number): Intl.NumberFormat {
  let formatador = formatadoresDecimais.get(casas);
  if (!formatador) {
    formatador = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
    });
    formatadoresDecimais.set(casas, formatador);
  }
  return formatador;
}

const formatadorQuantidade = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 8,
});

export function formatarNumero(valor: Numerico, casas = 2): string {
  return formatadorDecimal(casas).format(paraNumero(valor));
}

export function formatarQuantidade(valor: Numerico): string {
  return formatadorQuantidade.format(paraNumero(valor));
}

export function formatarMoeda(valor: Numerico, moeda?: string): string {
  const numero = paraNumero(valor);
  if (!moeda) return formatarNumero(numero);
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda }).format(numero);
  } catch {
    return `${moeda} ${formatarNumero(numero)}`;
  }
}

export function formatarPercentual(valor: Numerico, escala: EscalaPercentual): string {
  const pontos = escala === 'fracao' ? paraNumero(valor) * 100 : paraNumero(valor);
  const absoluto = formatarNumero(Math.abs(pontos));
  if (absoluto === '0,00') return '0,00%';
  return `${pontos > 0 ? '+' : '-'}${absoluto}%`;
}

function doisDigitos(numero: number): string {
  return String(numero).padStart(2, '0');
}

export function formatarData(iso: string): string {
  const soData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (soData) return `${soData[3]}/${soData[2]}/${soData[1]}`;
  const data = new Date(iso);
  return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${data.getFullYear()}`;
}

export function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  return `${formatarData(iso)} ${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
}

/** Espera sugerida pelo servidor (Retry-After, em segundos) em linguagem corrente: "30 s", "cerca de 2 min". */
export function formatarEspera(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos <= 0) return 'alguns instantes';
  const inteiros = Math.ceil(segundos);
  if (inteiros < 60) return `${inteiros} s`;
  if (inteiros < 3600) return `cerca de ${Math.ceil(inteiros / 60)} min`;
  return `cerca de ${Math.ceil(inteiros / 3600)} h`;
}

export function dataParaISOLocal(data: Date): DataISO {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

export function normalizarDecimal(entrada: string): Decimal | null {
  const texto = entrada.trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(texto) ? texto : null;
}
