/**
 * Tokens de cor do design system InsightFlow (mesma identidade do cliente web, `src/index.css` do web).
 * Os valores do web foram mantidos, exceto onde não atingiam contraste AA (4,5:1) nos fundos em que o token é usado;
 * nesses casos o valor foi escurecido/clareado no mínimo necessário (mesmo matiz) e o desvio está comentado ao lado.
 */
export interface Cores {
  fundo: string;
  superficie: string;
  superficieElevada: string;
  superficieAlta: string;
  borda: string;
  bordaForte: string;
  texto: string;
  textoSecundario: string;
  textoTerciario: string;
  /** Só decorativo/desativado: NUNCA para texto informativo (não é testado em contraste). */
  textoDesativado: string;
  primaria: string;
  primariaHover: string;
  textoSobrePrimaria: string;
  destaque: string;
  ia: string;
  positivo: string;
  negativo: string;
  alerta: string;
}

/** Fundos suaves das pills; a cor do texto do tom vem de `Cores` (exceto `laranjaTexto`). */
export interface Tons {
  verdeFundo: string;
  vermelhoFundo: string;
  amareloFundo: string;
  laranjaFundo: string;
  laranjaTexto: string;
  azulFundo: string;
  violetaFundo: string;
}

export interface CoresGrafico {
  alta: string;
  baixa: string;
  eixo: string;
  sma20: string;
  sma50: string;
  sma200: string;
  benchCarteira: string;
}

export const coresEscuro: Cores = {
  fundo: '#070b14',
  superficie: '#0f1626',
  superficieElevada: '#141d33',
  superficieAlta: '#1b2540',
  borda: '#1e293f',
  bordaForte: '#2c3b5e',
  texto: '#eef2f9',
  textoSecundario: '#a7b3c9',
  textoTerciario: '#7985a2', // web: #7683a0 (4,41:1 sobre superficieElevada)
  textoDesativado: '#4b5670',
  primaria: '#3aa0ff',
  primariaHover: '#5cb3ff',
  // web usa branco; branco sobre #3aa0ff dá ≈2,6:1, então o texto sobre a primária é o fundo escuro.
  textoSobrePrimaria: '#070b14',
  destaque: '#f5a623',
  ia: '#b18cff',
  positivo: '#22c58a',
  negativo: '#fb5468',
  alerta: '#f0b429',
};

export const coresClaro: Cores = {
  fundo: '#eef1f6',
  superficie: '#ffffff',
  superficieElevada: '#f5f7fb',
  superficieAlta: '#e8ecf5',
  borda: '#dde3ef',
  bordaForte: '#c3ccdf',
  texto: '#141b2e',
  textoSecundario: '#48546f',
  textoTerciario: '#616e86', // web: #71809c (3,98:1 sobre branco)
  textoDesativado: '#9aa6bd',
  primaria: '#1e6bc9', // web: #1f6fd1 (4,36:1 sobre o fundo)
  primariaHover: '#175dae',
  textoSobrePrimaria: '#ffffff',
  destaque: '#98620b', // web: #b9770e (3,25:1)
  ia: '#7356c7', // web: #7c5cd6 (4,26:1)
  positivo: '#0c7e4f', // web: #0f9d63 (3,08:1)
  negativo: '#c72d42', // web: #e0324a (3,93:1)
  alerta: '#92610a',
};

export const tonsEscuro: Tons = {
  verdeFundo: '#0d2b20',
  vermelhoFundo: '#341019',
  amareloFundo: '#2b2000',
  laranjaFundo: '#2c1c05',
  laranjaTexto: '#f0a94e',
  azulFundo: '#0d2038',
  violetaFundo: '#221148',
};

export const tonsClaro: Tons = {
  verdeFundo: '#e3f7ec',
  vermelhoFundo: '#fde6e9',
  amareloFundo: '#fdf1d8',
  laranjaFundo: '#fdead2',
  laranjaTexto: '#92510a',
  azulFundo: '#e4f0ff',
  violetaFundo: '#efe7ff',
};

// Elementos gráficos (não texto) seguem os valores do web: precisam de 3:1, não de 4,5:1.
export const graficoEscuro: CoresGrafico = {
  alta: '#22c58a',
  baixa: '#fb5468',
  eixo: '#5b6780',
  sma20: '#3aa0ff',
  sma50: '#f5a623',
  sma200: '#b18cff',
  benchCarteira: '#22c58a',
};

export const graficoClaro: CoresGrafico = {
  alta: '#0f9d63',
  baixa: '#e0324a',
  eixo: '#8391ab',
  sma20: '#1f6fd1',
  sma50: '#b9770e',
  sma200: '#7c5cd6',
  benchCarteira: '#0f9d63',
};

/** Cores de série para gráficos categóricos (a legenda sempre traz rótulo e valor, então a cor nunca é o único sinal). */
export function criarSerie(cores: Cores, grafico: CoresGrafico): readonly string[] {
  return [grafico.sma20, grafico.benchCarteira, grafico.sma200, grafico.sma50, cores.negativo, grafico.eixo];
}

/** `#rrggbb` + alfa → `rgba(r,g,b,alfa)`. Só para uso dentro de `src/theme/`. */
export function comAlfa(hex: string, alfa: number): string {
  const [r, g, b] = [1, 3, 5].map((inicio) => parseInt(hex.slice(inicio, inicio + 2), 16));
  return `rgba(${r},${g},${b},${alfa})`;
}
