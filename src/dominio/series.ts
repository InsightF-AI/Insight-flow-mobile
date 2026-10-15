/**
 * Séries dos indicadores técnicos com as mesmas fórmulas do backend (pandas-ta). A API devolve só o valor mais
 * recente de cada indicador; estas séries mostram a evolução no gráfico e não substituem os valores oficiais.
 */
export type Serie = (number | null)[];

function vazia(tamanho: number): Serie {
  return new Array<number | null>(tamanho).fill(null);
}

export function sma(valores: readonly number[], periodo: number): Serie {
  const saida = vazia(valores.length);
  if (periodo < 1) return saida;
  let soma = 0;
  for (let i = 0; i < valores.length; i++) {
    soma += valores[i];
    if (i >= periodo) soma -= valores[i - periodo];
    if (i >= periodo - 1) saida[i] = soma / periodo;
  }
  return saida;
}

/** Média móvel exponencial semeada pela SMA do primeiro período (o `ema` do pandas-ta). */
export function ema(valores: readonly number[], periodo: number): Serie {
  const saida = vazia(valores.length);
  if (periodo < 1 || valores.length < periodo) return saida;
  const k = 2 / (periodo + 1);
  let anterior = valores.slice(0, periodo).reduce((soma, valor) => soma + valor, 0) / periodo;
  saida[periodo - 1] = anterior;
  for (let i = periodo; i < valores.length; i++) {
    anterior = valores[i] * k + anterior * (1 - k);
    saida[i] = anterior;
  }
  return saida;
}

/** RSI com suavização de Wilder iniciada na primeira variação. Série parada (sem ganho nem perda) fica sem valor. */
export function rsi(valores: readonly number[], periodo = 14): Serie {
  const saida = vazia(valores.length);
  let ganho = 0;
  let perda = 0;
  for (let i = 1; i < valores.length; i++) {
    const variacao = valores[i] - valores[i - 1];
    const alta = Math.max(variacao, 0);
    const baixa = Math.max(-variacao, 0);
    if (i === 1) {
      ganho = alta;
      perda = baixa;
    } else {
      ganho += (alta - ganho) / periodo;
      perda += (baixa - perda) / periodo;
    }
    if (i >= periodo && ganho + perda > 0) saida[i] = (100 * ganho) / (ganho + perda);
  }
  return saida;
}

export interface FaixasBollinger {
  superior: Serie;
  media: Serie;
  inferior: Serie;
}

/** Média de `periodo` fechamentos ± `desvios` desvios-padrão **amostrais** (divisor n − 1), como no backend. */
export function bollinger(valores: readonly number[], periodo = 20, desvios = 2): FaixasBollinger {
  const superior = vazia(valores.length);
  const media = vazia(valores.length);
  const inferior = vazia(valores.length);
  if (periodo < 2) return { superior, media, inferior };
  for (let i = periodo - 1; i < valores.length; i++) {
    let soma = 0;
    for (let j = i - periodo + 1; j <= i; j++) soma += valores[j];
    const m = soma / periodo;
    let quadrados = 0;
    for (let j = i - periodo + 1; j <= i; j++) quadrados += (valores[j] - m) ** 2;
    const faixa = desvios * Math.sqrt(quadrados / (periodo - 1));
    media[i] = m;
    superior[i] = m + faixa;
    inferior[i] = m - faixa;
  }
  return { superior, media, inferior };
}

export interface SeriesMacd {
  linha: Serie;
  sinal: Serie;
  histograma: Serie;
}

export function macd(valores: readonly number[], rapida = 12, lenta = 26, periodoSinal = 9): SeriesMacd {
  const emaRapida = ema(valores, rapida);
  const emaLenta = ema(valores, lenta);
  const linha: Serie = valores.map((_, i) => {
    const r = emaRapida[i];
    const l = emaLenta[i];
    return r !== null && l !== null ? r - l : null;
  });
  const sinal = vazia(valores.length);
  const histograma = vazia(valores.length);
  const primeiro = linha.findIndex((valor) => valor !== null);
  if (primeiro >= 0) {
    // A linha de sinal é a EMA da própria linha MACD, a partir do primeiro valor dela.
    const suavizada = ema(linha.slice(primeiro) as number[], periodoSinal);
    suavizada.forEach((valor, j) => {
      sinal[primeiro + j] = valor;
      const base = linha[primeiro + j];
      if (valor !== null && base !== null) histograma[primeiro + j] = base - valor;
    });
  }
  return { linha, sinal, histograma };
}
