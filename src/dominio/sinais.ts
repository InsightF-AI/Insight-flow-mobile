import type { Sinal } from '@/api/tipos';
import { formatarNumero } from '@/utils/formatacao';

// Regras padrão do backend (não há rota de configuração): `contexto.valor` é o valor do indicador da regra no disparo.
const REGRA_RSI_SOBREVENDA = 'a1a1a1a1-0000-0000-0000-000000000001';
const REGRA_RSI_SOBRECOMPRA = 'a1a1a1a1-0000-0000-0000-000000000002';
const REGRA_VOLUME_RELATIVO = 'a1a1a1a1-0000-0000-0000-000000000003';

export function valorNoDisparo(sinal: Sinal): { rotulo: string; valor: string } | null {
  const bruto = sinal.contexto.valor;
  if (typeof bruto !== 'string' && typeof bruto !== 'number') return null;
  // `Number('')` e `Number('  ')` são 0: texto em branco é ausência de valor, não zero.
  if (typeof bruto === 'string' && bruto.trim() === '') return null;
  const numero = Number(bruto);
  if (!Number.isFinite(numero)) return null;

  switch (sinal.regra_id) {
    case REGRA_RSI_SOBREVENDA:
    case REGRA_RSI_SOBRECOMPRA:
      return { rotulo: 'RSI (14)', valor: formatarNumero(numero, 1) };
    case REGRA_VOLUME_RELATIVO:
      return { rotulo: 'Volume relativo (20)', valor: `${formatarNumero(numero)}×` };
    default:
      return { rotulo: 'Indicador', valor: formatarNumero(numero) };
  }
}
