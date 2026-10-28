import type { Provento } from '@/api/tipos';
import { dataParaISOLocal, paraNumero } from '@/utils/formatacao';

/** Soma por cota dos proventos com data-ex nos 12 meses até `hoje` (datas ISO comparam como texto). */
export function somaDosUltimos12Meses(proventos: Provento[], hoje: Date = new Date()): number {
  const inicio = new Date(hoje);
  inicio.setFullYear(inicio.getFullYear() - 1);
  const limite = dataParaISOLocal(inicio);
  const fim = dataParaISOLocal(hoje);
  return proventos
    .filter((provento) => provento.data_ex >= limite && provento.data_ex <= fim)
    .reduce((total, provento) => total + paraNumero(provento.valor_por_cota), 0);
}
