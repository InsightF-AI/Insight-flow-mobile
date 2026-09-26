import type { IndicadorTecnico, TipoIndicador } from '@/api/tipos';
import { formatarNumero, paraNumero } from '@/utils/formatacao';

export interface IndicadorDescrito {
  chave: string;
  titulo: string;
  valor: string;
  descricao: string;
}

const ORDEM: Record<TipoIndicador, number> = { SMA: 0, RSI: 1, MACD: 2, BOLLINGER: 3, VOLUME_RELATIVO: 4 };

// Mesmos limiares das regras padrão do backend (menor_que 30 / maior_que 70).
const RSI_SOBREVENDA = 30;
const RSI_SOBRECOMPRA = 70;

function auxiliar(indicador: IndicadorTecnico, chave: string): number | null {
  const valor = indicador.valores_auxiliares?.[chave];
  return typeof valor === 'number' ? valor : null;
}

function posicaoFrenteMedia(preco: number | null, media: number): string {
  if (preco === null) return 'Sem cotação atual para comparar';
  if (preco > media) return 'Preço atual acima da média';
  if (preco < media) return 'Preço atual abaixo da média';
  return 'Preço atual no nível da média';
}

function descrever(indicador: IndicadorTecnico, preco: number | null): IndicadorDescrito {
  const valor = paraNumero(indicador.valor);
  const p = indicador.parametros;
  const chave = `${indicador.tipo}-${Object.values(p).join('-')}`;

  switch (indicador.tipo) {
    case 'SMA':
      return { chave, titulo: `SMA ${p.periodo}`, valor: formatarNumero(valor), descricao: posicaoFrenteMedia(preco, valor) };

    case 'RSI': {
      const descricao =
        valor < RSI_SOBREVENDA
          ? 'Zona de sobrevenda (abaixo de 30)'
          : valor > RSI_SOBRECOMPRA
            ? 'Zona de sobrecompra (acima de 70)'
            : 'Zona neutra (entre 30 e 70)';
      return { chave, titulo: `RSI ${p.periodo}`, valor: formatarNumero(valor, 1), descricao };
    }

    case 'MACD': {
      const sinal = auxiliar(indicador, 'linha_sinal');
      const histograma = auxiliar(indicador, 'histograma');
      const partes = [
        sinal !== null ? `Sinal ${formatarNumero(sinal)}` : null,
        histograma !== null ? `Histograma ${formatarNumero(histograma)}` : null,
      ].filter((parte): parte is string => parte !== null);
      const relacao =
        histograma === null || histograma === 0
          ? ''
          : histograma > 0
            ? ' — linha MACD acima da linha de sinal'
            : ' — linha MACD abaixo da linha de sinal';
      return {
        chave,
        titulo: `MACD ${p.rapida}/${p.lenta}/${p.sinal}`,
        valor: formatarNumero(valor),
        descricao: `${partes.join(' · ')}${relacao}`,
      };
    }

    case 'BOLLINGER': {
      const superior = auxiliar(indicador, 'banda_superior');
      const inferior = auxiliar(indicador, 'banda_inferior');
      if (superior === null || inferior === null) {
        return { chave, titulo: `Bollinger ${p.periodo}/${p.desvios}`, valor: formatarNumero(valor), descricao: 'Bandas indisponíveis' };
      }
      const faixa = `Superior ${formatarNumero(superior)} · Inferior ${formatarNumero(inferior)}`;
      const posicao =
        preco === null
          ? ''
          : preco > superior
            ? ' — preço acima da banda superior'
            : preco < inferior
              ? ' — preço abaixo da banda inferior'
              : ' — preço dentro das bandas';
      return { chave, titulo: `Bollinger ${p.periodo}/${p.desvios}`, valor: formatarNumero(valor), descricao: `${faixa}${posicao}` };
    }

    case 'VOLUME_RELATIVO':
      return {
        chave,
        titulo: `Volume relativo ${p.periodo}`,
        valor: `${formatarNumero(valor)}×`,
        descricao: `Volume ${formatarNumero(valor)}× a média de ${p.periodo} pregões`,
      };
  }
}

export function descreverIndicadores(indicadores: IndicadorTecnico[], precoAtual: number | null): IndicadorDescrito[] {
  return [...indicadores]
    .sort((a, b) => ORDEM[a.tipo] - ORDEM[b.tipo] || (a.parametros.periodo ?? 0) - (b.parametros.periodo ?? 0))
    .map((indicador) => descrever(indicador, precoAtual));
}
