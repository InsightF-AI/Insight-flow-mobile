# Etapa 4: busca e detalhe do ativo — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao detalhe do ativo gráfico de candles com volume, médias móveis e Bollinger alternáveis, mira por toque, RSI (30/70) e MACD, sinais com o valor no disparo e backtest "sem dados", e tornar explícita a adição à watchlist na busca.

**Architecture:** Cálculo das séries (SMA, EMA, RSI de Wilder, Bollinger amostral, MACD) e geometria de desenho em funções puras com teste (`src/dominio/`). Componentes Skia finos (`GraficoCandles`, `GraficoIndicador`) só desenham o que a geometria entrega; o toque usa Gesture Handler com callbacks no JS. `PainelTecnico` guarda os interruptores e o candle selecionado. As séries são calculadas no app sobre o histórico (a API devolve só o último valor), com 5A de aquecimento para as médias não começarem vazias.

**Tech Stack:** Expo SDK 57, React Native 0.86, `@shopify/react-native-skia` 2.6, `react-native-gesture-handler` 2.32, TanStack Query 5, Jest + React Native Testing Library 14.

**Spec:** `docs/PLANO.md` §2 (gráficos), §5.4 e §8 (Etapa 4); `docs/MAPEAMENTO.md` §2.5 (histórico por período, data dos candles) e §7.1 item 11 (fórmulas); decisão D6 (adição explícita à watchlist).

## Global Constraints

- Repositório `C:\Users\Bruno\Insight-flow-mobile`; branch `feature/etapa-4-detalhe-do-ativo` a partir de `feature/etapa-3-inicio` (PR #4 aberto). Não alterar backend, web nem desktop.
- Sem dependências novas (Skia, Gesture Handler e Reanimated já estão instalados).
- Fórmulas do backend (pandas-ta), conferidas pelo desktop: SMA simples; Bollinger (20, 2) com desvio-padrão **amostral** (divisor n−1); RSI(14) com suavização de Wilder iniciada na primeira variação (série parada = sem valor); EMA semeada pela SMA do primeiro período; MACD (12, 26, 9).
- Data do candle = parte UTC da string (`AAAA-MM-DD`); nunca converter para o fuso do aparelho.
- Histórico `1D` é um ponto único (não é intradiário): sem gráfico, com explicação. `5A` não faz a segunda consulta de aquecimento.
- Verde/vermelho só para alta/baixa e positivo/negativo; linhas de referência e Bollinger em cor neutra.
- Fronteiras do `CLAUDE.md`: `app/` só rotas; `src/components/` por props e sem hooks de dados; regras puras em `src/dominio/` com teste ao lado; cores só via `useTema()`; nunca `fontWeight`; alvo de toque ≥ 44 pt.
- Linguagem factual: nenhum texto de compra/venda.
- Skia não é transformável pelo Jest deste projeto: testes de componente mockam `@shopify/react-native-skia`; a lógica testável fica na geometria pura.
- `npm run verificar` verde ao fim de cada tarefa; commits em pt-BR terminando com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`; `gh`/`git push` com `GH_TOKEN="$(gh auth token --user brunoosouza09)"` exportado na mesma chamada.

## Review Focus

1. **Histórico curto** (1 candle, 2 candles, ativo recém-adicionado com poucos pregões): sem divisão por zero, `NaN`, retângulo de altura zero invisível ou crash; mensagem explicativa quando não dá para desenhar. Tarefas 2, 3 e 6.
2. **Aquecimento ausente** (a consulta 5A falha ou ainda carrega): o gráfico aparece com as séries que dá para calcular, sem valor inventado nem erro na tela. Tarefas 2 e 6.
3. **Série sem variação** (preço parado): RSI sem valor, Bollinger com faixa zero, candles de corpo mínimo visível; escala não degenera. Tarefas 1 e 3.
4. **Troca de período** com consulta em andamento: não mostra o gráfico do período anterior como se fosse o novo; a seleção da mira não vaza entre períodos. Tarefas 5 e 6.
5. **Candle de cripto** (data `T00:00:00Z`) e da B3 (`T03:00:00Z`): a data exibida é a mesma da string UTC, nos dois. Tarefa 2.

---

### Task 1: Séries dos indicadores

**Files:**
- Create: `src/dominio/series.ts`, `src/dominio/series.test.ts`

**Interfaces:**
- Produces (Tarefas 2 e 5 usam):
  - `type Serie = (number | null)[]`
  - `sma(valores: readonly number[], periodo: number): Serie`
  - `ema(valores: readonly number[], periodo: number): Serie` (semeada pela SMA)
  - `rsi(valores: readonly number[], periodo?: number): Serie` (padrão 14)
  - `bollinger(valores: readonly number[], periodo?: number, desvios?: number): { superior: Serie; media: Serie; inferior: Serie }` (20, 2)
  - `macd(valores: readonly number[], rapida?: number, lenta?: number, sinal?: number): { linha: Serie; sinal: Serie; histograma: Serie }` (12, 26, 9)

- [ ] **Step 1: Criar a branch**

```bash
cd /c/Users/Bruno/Insight-flow-mobile
git status --short
git switch -c feature/etapa-4-detalhe-do-ativo feature/etapa-3-inicio
```

Expected: árvore limpa (o plano e os arquivos novos entram nos commits das tarefas); `Switched to a new branch`.

- [ ] **Step 2: Escrever os testes (falham)**

`src/dominio/series.test.ts`:

```ts
import { bollinger, ema, macd, rsi, sma } from '@/dominio/series';

const UM_A_VINTE_E_CINCO = Array.from({ length: 25 }, (_, i) => i + 1);

describe('sma', () => {
  it('só tem valor a partir do período', () => {
    const serie = sma(UM_A_VINTE_E_CINCO, 20);
    expect(serie[18]).toBeNull();
    expect(serie[19]).toBeCloseTo(10.5, 10);
    expect(serie[24]).toBeCloseTo(15.5, 10);
  });

  it('série menor que o período fica toda sem valor', () => {
    expect(sma([1, 2, 3], 5)).toEqual([null, null, null]);
  });
});

describe('ema', () => {
  it('é semeada pela média do primeiro período e depois recursiva', () => {
    const serie = ema(Array.from({ length: 30 }, (_, i) => i + 1), 10);
    expect(serie[8]).toBeNull();
    expect(serie[9]).toBeCloseTo(5.5, 10);
    expect(serie[10]).toBeCloseTo(6.5, 10);
    expect(serie[11]).toBeCloseTo(7.5, 10);
  });

  it('série menor que o período fica toda sem valor', () => {
    expect(ema([1, 2], 5)).toEqual([null, null]);
  });
});

describe('rsi', () => {
  it('só altas: 100 a partir do 15º registro', () => {
    const serie = rsi(UM_A_VINTE_E_CINCO);
    expect(serie[13]).toBeNull();
    expect(serie[14]).toBeCloseTo(100, 10);
  });

  it('uma queda depois das altas reduz o RSI (Wilder)', () => {
    const serie = rsi([...UM_A_VINTE_E_CINCO, 20]);
    // ganho médio 13/14, perda média 5/14 → 100 × 13/18
    expect(serie[25]).toBeCloseTo(72.2222, 3);
  });

  it('série parada não tem ganho nem perda: sem valor, como no pandas-ta', () => {
    expect(rsi(Array.from({ length: 30 }, () => 7)).every((valor) => valor === null)).toBe(true);
  });
});

describe('bollinger', () => {
  it('usa o desvio-padrão amostral (divisor n − 1)', () => {
    const { superior, media, inferior } = bollinger(UM_A_VINTE_E_CINCO);
    expect(superior[18]).toBeNull();
    expect(media[19]).toBeCloseTo(10.5, 10);
    // desvio amostral de 1..20 = √35
    expect(superior[19]).toBeCloseTo(10.5 + 2 * Math.sqrt(35), 8);
    expect(inferior[19]).toBeCloseTo(10.5 - 2 * Math.sqrt(35), 8);
  });

  it('série parada tem faixa de largura zero', () => {
    const { superior, inferior } = bollinger(Array.from({ length: 25 }, () => 10));
    expect(superior[24]).toBeCloseTo(10, 10);
    expect(inferior[24]).toBeCloseTo(10, 10);
  });
});

describe('macd', () => {
  it('em reta de inclinação 1 a linha é constante (7) e o histograma é zero', () => {
    const { linha, sinal, histograma } = macd(Array.from({ length: 60 }, (_, i) => i + 1));
    expect(linha[24]).toBeNull();
    expect(linha[25]).toBeCloseTo(7, 8);
    expect(sinal[32]).toBeNull();
    expect(sinal[33]).toBeCloseTo(7, 8);
    expect(histograma[33]).toBeCloseTo(0, 8);
    expect(histograma[59]).toBeCloseTo(0, 8);
  });

  it('série curta demais fica toda sem valor', () => {
    const { linha, sinal, histograma } = macd([1, 2, 3, 4, 5]);
    expect([...linha, ...sinal, ...histograma].every((valor) => valor === null)).toBe(true);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx jest src/dominio/series.test.ts`
Expected: FAIL (`Cannot find module '@/dominio/series'`).

- [ ] **Step 4: Implementar `src/dominio/series.ts`**

```ts
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
```

- [ ] **Step 5: Rodar e ver passar; verificar; commitar**

Run: `npx jest src/dominio/series.test.ts` → PASS.
Run: `npm run verificar` → exit 0.

```bash
git add docs/superpowers/plans/2026-10-10-etapa-4-detalhe-do-ativo.md src/dominio/series.ts src/dominio/series.test.ts
git commit -m "feat(grafico): séries de SMA, EMA, RSI, Bollinger e MACD com as fórmulas do backend" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Candles e análise técnica com aquecimento

**Files:**
- Create: `src/dominio/candles.ts`, `src/dominio/candles.test.ts`

**Interfaces:**
- Consumes: `PontoHistorico` de `@/api/tipos`; `sma`, `bollinger`, `rsi`, `macd`, `Serie`, `FaixasBollinger`, `SeriesMacd` (Tarefa 1); `paraNumero`.
- Produces (Tarefas 3, 5 e 6):
  - `interface Candle { data: string; abertura: number; maxima: number; minima: number; fechamento: number; volume: number }` (`data` = `AAAA-MM-DD` UTC)
  - `prepararCandles(historico: PontoHistorico[]): Candle[]` (ordena, descarta inválidos, uma entrada por data)
  - `interface AnaliseTecnica { candles: Candle[]; sma20: Serie; sma50: Serie; sma200: Serie; bollinger: FaixasBollinger; rsi: Serie; macd: SeriesMacd }`, todas as séries alinhadas a `candles`
  - `prepararAnaliseTecnica(exibido: PontoHistorico[], completo?: PontoHistorico[]): AnaliseTecnica | null` (null com menos de 2 candles)

- [ ] **Step 1: Escrever os testes (falham)**

`src/dominio/candles.test.ts`:

```ts
import type { PontoHistorico } from '@/api/tipos';
import { prepararAnaliseTecnica, prepararCandles } from '@/dominio/candles';

function ponto(data: string, fechamento: number, parcial: Partial<PontoHistorico> = {}): PontoHistorico {
  return {
    data,
    abertura: String(fechamento - 0.5),
    maxima: String(fechamento + 1),
    minima: String(fechamento - 1),
    fechamento: String(fechamento),
    volume: '1000',
    ...parcial,
  };
}

/** `dias` pontos diários consecutivos a partir de 2026-01-01, fechamento = 100 + índice. */
function serieDiaria(dias: number, inicioIndice = 0): PontoHistorico[] {
  return Array.from({ length: dias }, (_, i) => {
    const data = new Date(Date.UTC(2026, 0, 1 + inicioIndice + i)).toISOString();
    return ponto(data, 100 + inicioIndice + i);
  });
}

describe('prepararCandles', () => {
  it('ordena do mais antigo para o mais recente e converte decimais', () => {
    const candles = prepararCandles([ponto('2026-09-14T03:00:00Z', 12), ponto('2026-09-12T03:00:00Z', 10)]);
    expect(candles.map((c) => c.data)).toEqual(['2026-09-12', '2026-09-14']);
    expect(candles[0]).toEqual({
      data: '2026-09-12',
      abertura: 9.5,
      maxima: 11,
      minima: 9,
      fechamento: 10,
      volume: 1000,
    });
  });

  it('a data é a parte UTC da string, igual para cripto (00:00Z) e para a B3 (03:00Z)', () => {
    const candles = prepararCandles([ponto('2026-09-12T00:00:00Z', 10), ponto('2026-09-13T03:00:00Z', 11)]);
    expect(candles.map((c) => c.data)).toEqual(['2026-09-12', '2026-09-13']);
  });

  it('descarta pontos com preço inválido e trata volume inválido como zero', () => {
    const candles = prepararCandles([
      ponto('2026-09-12T03:00:00Z', 10, { fechamento: 'abc' }),
      ponto('2026-09-13T03:00:00Z', 11, { volume: 'x' }),
    ]);
    expect(candles).toHaveLength(1);
    expect(candles[0].volume).toBe(0);
  });

  it('mantém uma entrada por data (a última vence)', () => {
    const candles = prepararCandles([ponto('2026-09-12T03:00:00Z', 10), ponto('2026-09-12T09:00:00Z', 11)]);
    expect(candles).toHaveLength(1);
    expect(candles[0].fechamento).toBe(11);
  });
});

describe('prepararAnaliseTecnica', () => {
  it('histórico com menos de 2 candles não tem análise', () => {
    expect(prepararAnaliseTecnica([])).toBeNull();
    expect(prepararAnaliseTecnica([ponto('2026-09-12T03:00:00Z', 10)])).toBeNull();
  });

  it('sem aquecimento calcula só com o que foi exibido, sem inventar valor', () => {
    const analise = prepararAnaliseTecnica(serieDiaria(10));
    expect(analise?.candles).toHaveLength(10);
    expect(analise?.sma20.every((v) => v === null)).toBe(true);
    expect(analise?.rsi.every((v) => v === null)).toBe(true);
    expect(analise?.sma20).toHaveLength(10);
  });

  it('com 5A de aquecimento as médias existem desde o primeiro candle exibido', () => {
    const completo = serieDiaria(60);
    const exibido = completo.slice(-10);
    const analise = prepararAnaliseTecnica(exibido, completo);
    expect(analise?.candles).toHaveLength(10);
    expect(analise?.candles[0].data).toBe('2026-02-20');
    // índice 50 do completo: média dos fechamentos 130..149 → índices 31..50 → 100+31..100+50
    const esperado = Array.from({ length: 20 }, (_, i) => 131 + i).reduce((a, b) => a + b, 0) / 20;
    expect(analise?.sma20[0]).toBeCloseTo(esperado, 8);
    expect(analise?.sma50[0]).not.toBeNull();
    expect(analise?.rsi[0]).not.toBeNull();
    expect(analise?.macd.linha[0]).not.toBeNull();
  });

  it('as séries têm o mesmo tamanho dos candles exibidos', () => {
    const completo = serieDiaria(60);
    const analise = prepararAnaliseTecnica(completo.slice(-10), completo);
    for (const serie of [
      analise!.sma20,
      analise!.sma50,
      analise!.sma200,
      analise!.bollinger.superior,
      analise!.bollinger.media,
      analise!.bollinger.inferior,
      analise!.rsi,
      analise!.macd.linha,
      analise!.macd.sinal,
      analise!.macd.histograma,
    ]) {
      expect(serie).toHaveLength(10);
    }
  });

  it('o aquecimento que não cobre o início exibido é ignorado', () => {
    const exibido = serieDiaria(10, 100);
    const completo = serieDiaria(10, 0);
    const analise = prepararAnaliseTecnica(exibido, completo);
    expect(analise?.candles[0].data).toBe(prepararCandles(exibido)[0].data);
    expect(analise?.sma20.every((v) => v === null)).toBe(true);
  });

  it('corta o aquecimento na última data exibida', () => {
    const completo = serieDiaria(60);
    const exibido = completo.slice(40, 50);
    const analise = prepararAnaliseTecnica(exibido, completo);
    expect(analise?.candles).toHaveLength(10);
    expect(analise?.candles[9].data).toBe(prepararCandles(exibido)[9].data);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/dominio/candles.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `src/dominio/candles.ts`**

```ts
import type { PontoHistorico } from '@/api/tipos';
import { bollinger, type FaixasBollinger, macd, rsi, type Serie, type SeriesMacd, sma } from '@/dominio/series';
import { paraNumero } from '@/utils/formatacao';

export interface Candle {
  /** `AAAA-MM-DD`, a parte UTC da string do backend (cripto vem 00:00Z; B3, 03:00Z). Nunca convertida de fuso. */
  data: string;
  abertura: number;
  maxima: number;
  minima: number;
  fechamento: number;
  volume: number;
}

export function prepararCandles(historico: PontoHistorico[]): Candle[] {
  const porData = new Map<string, Candle>();
  for (const ponto of historico) {
    const candle: Candle = {
      data: ponto.data.slice(0, 10),
      abertura: paraNumero(ponto.abertura),
      maxima: paraNumero(ponto.maxima),
      minima: paraNumero(ponto.minima),
      fechamento: paraNumero(ponto.fechamento),
      volume: paraNumero(ponto.volume),
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

/**
 * Séries calculadas sobre o histórico e recortadas para o período exibido. `completo` (histórico 5A) só serve de
 * aquecimento: sem ele as médias começariam vazias. Se ele não cobre o início do período, é ignorado.
 */
export function prepararAnaliseTecnica(exibido: PontoHistorico[], completo?: PontoHistorico[]): AnaliseTecnica | null {
  const visiveis = prepararCandles(exibido);
  if (visiveis.length < 2) return null;
  const inicio = visiveis[0].data;
  const fim = visiveis[visiveis.length - 1].data;

  const aquecido = completo ? prepararCandles(completo) : [];
  const base = aquecido.length > 0 && aquecido[0].data <= inicio ? aquecido : visiveis;

  let ultimo = base.length - 1;
  while (ultimo > 0 && base[ultimo].data > fim) ultimo -= 1;
  const primeiro = base.findIndex((candle) => candle.data >= inicio);
  if (primeiro < 0 || primeiro > ultimo) return null;

  const ate = base.slice(0, ultimo + 1);
  const fechamentos = ate.map((candle) => candle.fechamento);
  const recortar = (serie: Serie): Serie => serie.slice(primeiro);
  const faixas = bollinger(fechamentos);
  const series = macd(fechamentos);

  return {
    candles: ate.slice(primeiro),
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
      linha: recortar(series.linha),
      sinal: recortar(series.sinal),
      histograma: recortar(series.histograma),
    },
  };
}
```

- [ ] **Step 4: Rodar e ver passar; verificar; commitar**

Run: `npx jest src/dominio/candles.test.ts` → PASS.
Run: `npm run verificar` → exit 0.

```bash
git add src/dominio/candles.ts src/dominio/candles.test.ts
git commit -m "feat(grafico): candles e análise técnica recortada com aquecimento do histórico 5A" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Geometria dos gráficos

**Files:**
- Create: `src/dominio/geometriaGrafico.ts`, `src/dominio/geometriaGrafico.test.ts`

**Interfaces:**
- Consumes: `Candle` (Tarefa 2), `Serie` (Tarefa 1).
- Produces (Tarefa 5):
  - `interface Ponto { x: number; y: number }`
  - `posicoesX(quantidade: number, largura: number): { xs: number[]; passo: number }`
  - `indiceDoX(x: number, quantidade: number, largura: number): number` (limitado a `0..n-1`)
  - `segmentosDaSerie(serie: Serie, xs: readonly number[], yDoValor: (valor: number) => number): Ponto[][]` (quebra nos nulos)
  - `interface GeometriaCandles { xs: number[]; passo: number; yPreco: (preco: number) => number; corpos: Corpo[]; pavios: Pavio[]; volumes: BarraVolume[] }` com `Corpo = { x; y; largura; altura; alta }`, `Pavio = { x; y1; y2; alta }`, `BarraVolume = { x; y; largura; altura; alta }`
  - `criarGeometriaCandles(candles: readonly Candle[], largura: number, altura: number, extras?: readonly number[]): GeometriaCandles`
  - `interface GeometriaIndicador { yDoValor; linhas: Ponto[][][]; barras: BarraIndicador[]; referencias: { valor: number; y: number }[] }` com `BarraIndicador = { x; y; largura; altura; positiva }`
  - `criarGeometriaIndicador(args: { xs: readonly number[]; passo: number; altura: number; series: readonly Serie[]; barras?: Serie; dominio?: readonly [number, number]; referencias?: readonly number[] }): GeometriaIndicador`

- [ ] **Step 1: Escrever os testes (falham)**

`src/dominio/geometriaGrafico.test.ts`:

```ts
import type { Candle } from '@/dominio/candles';
import {
  criarGeometriaCandles,
  criarGeometriaIndicador,
  indiceDoX,
  posicoesX,
  segmentosDaSerie,
} from '@/dominio/geometriaGrafico';

function candle(fechamento: number, parcial: Partial<Candle> = {}): Candle {
  return {
    data: '2026-09-12',
    abertura: fechamento - 1,
    maxima: fechamento + 2,
    minima: fechamento - 2,
    fechamento,
    volume: 100,
    ...parcial,
  };
}

describe('posicoesX e indiceDoX', () => {
  it('distribui os candles com margem de 4 px e centro em cada passo', () => {
    const { xs, passo } = posicoesX(10, 108);
    expect(passo).toBe(10);
    expect(xs[0]).toBe(9);
    expect(xs[9]).toBe(99);
  });

  it('o toque devolve o candle mais próximo, limitado às pontas', () => {
    expect(indiceDoX(9, 10, 108)).toBe(0);
    expect(indiceDoX(39, 10, 108)).toBe(3);
    expect(indiceDoX(-50, 10, 108)).toBe(0);
    expect(indiceDoX(500, 10, 108)).toBe(9);
  });

  it('sem candles não quebra', () => {
    expect(posicoesX(0, 100).xs).toEqual([]);
    expect(indiceDoX(10, 0, 100)).toBe(0);
  });
});

describe('segmentosDaSerie', () => {
  it('quebra a linha onde não há valor', () => {
    const segmentos = segmentosDaSerie([null, 1, 2, null, 3], [0, 10, 20, 30, 40], (v) => 100 - v);
    expect(segmentos).toEqual([
      [
        { x: 10, y: 99 },
        { x: 20, y: 98 },
      ],
      [{ x: 40, y: 97 }],
    ]);
  });
});

describe('criarGeometriaCandles', () => {
  it('cor e corpo seguem fechamento ≥ abertura; pavio vai da máxima à mínima', () => {
    const g = criarGeometriaCandles([candle(10), candle(8, { abertura: 9 })], 108, 200);
    expect(g.corpos[0].alta).toBe(true);
    expect(g.corpos[1].alta).toBe(false);
    expect(g.pavios[0].y1).toBeLessThan(g.pavios[0].y2);
    expect(g.yPreco(12)).toBeLessThan(g.yPreco(6));
  });

  it('corpo de doji (abertura = fechamento) ainda tem altura visível', () => {
    const g = criarGeometriaCandles([candle(10, { abertura: 10 }), candle(11)], 108, 200);
    expect(g.corpos[0].altura).toBeGreaterThanOrEqual(1);
  });

  it('série parada não degenera a escala', () => {
    const parado = [10, 10, 10].map((v) => candle(v, { abertura: v, maxima: v, minima: v }));
    const g = criarGeometriaCandles(parado, 108, 200);
    for (const corpo of g.corpos) expect(Number.isFinite(corpo.y)).toBe(true);
    expect(Number.isFinite(g.yPreco(10))).toBe(true);
  });

  it('um único candle não quebra', () => {
    const g = criarGeometriaCandles([candle(10)], 108, 200);
    expect(g.xs).toHaveLength(1);
    expect(Number.isFinite(g.corpos[0].x)).toBe(true);
  });

  it('o volume mais alto ocupa o painel inteiro e candle sem volume não tem barra', () => {
    const g = criarGeometriaCandles([candle(10, { volume: 100 }), candle(11, { volume: 50 }), candle(12, { volume: 0 })], 108, 200);
    expect(g.volumes[0].altura).toBeGreaterThan(g.volumes[1].altura);
    expect(g.volumes[1].altura).toBeCloseTo(g.volumes[0].altura / 2, 8);
    expect(g.volumes[2].altura).toBe(0);
  });

  it('valores extras (Bollinger, médias) ampliam a escala para a linha não sair do quadro', () => {
    const sem = criarGeometriaCandles([candle(10), candle(11)], 108, 200);
    const com = criarGeometriaCandles([candle(10), candle(11)], 108, 200, [30]);
    expect(com.yPreco(30)).toBeGreaterThanOrEqual(0);
    expect(com.yPreco(10)).toBeGreaterThan(sem.yPreco(10));
  });
});

describe('criarGeometriaIndicador', () => {
  const { xs, passo } = posicoesX(5, 108);

  it('RSI: domínio fixo 0–100 e linhas de referência nas posições certas', () => {
    const g = criarGeometriaIndicador({
      xs,
      passo,
      altura: 100,
      series: [[null, 20, 50, 80, 100]],
      dominio: [0, 100],
      referencias: [30, 70],
    });
    expect(g.referencias.map((r) => r.valor)).toEqual([30, 70]);
    expect(g.referencias[1].y).toBeLessThan(g.referencias[0].y);
    expect(g.linhas[0][0]).toHaveLength(4);
    expect(g.yDoValor(100)).toBeLessThan(g.yDoValor(0));
  });

  it('MACD: barras partem da linha zero, positivas para cima e negativas para baixo', () => {
    const g = criarGeometriaIndicador({
      xs,
      passo,
      altura: 100,
      series: [[null, null, 1, 2, 1]],
      barras: [null, null, 1, -2, 0.5],
    });
    const zero = g.yDoValor(0);
    expect(g.barras).toHaveLength(3);
    expect(g.barras[0].positiva).toBe(true);
    expect(g.barras[0].y + g.barras[0].altura).toBeCloseTo(zero, 6);
    expect(g.barras[1].positiva).toBe(false);
    expect(g.barras[1].y).toBeCloseTo(zero, 6);
  });

  it('sem nenhum valor usa um domínio simétrico válido', () => {
    const g = criarGeometriaIndicador({ xs, passo, altura: 100, series: [[null, null, null, null, null]] });
    expect(Number.isFinite(g.yDoValor(0))).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/dominio/geometriaGrafico.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `src/dominio/geometriaGrafico.ts`**

```ts
import type { Candle } from '@/dominio/candles';
import type { Serie } from '@/dominio/series';

export interface Ponto {
  x: number;
  y: number;
}

const MARGEM_HORIZONTAL = 4;
const FRACAO_PRECO = 0.78;
const FRACAO_ESPACO = 0.04;
const FOLGA_PRECO = 0.05;
const MARGEM_VERTICAL_INDICADOR = 4;

/** Mesmo mapeamento horizontal para candles, RSI e MACD: a mira cai na mesma coluna nos três. */
export function posicoesX(quantidade: number, largura: number): { xs: number[]; passo: number } {
  const util = Math.max(largura - 2 * MARGEM_HORIZONTAL, 1);
  const passo = quantidade > 0 ? util / quantidade : util;
  const xs = Array.from({ length: quantidade }, (_, i) => MARGEM_HORIZONTAL + (i + 0.5) * passo);
  return { xs, passo };
}

export function indiceDoX(x: number, quantidade: number, largura: number): number {
  if (quantidade <= 0) return 0;
  const { passo } = posicoesX(quantidade, largura);
  const indice = Math.round((x - MARGEM_HORIZONTAL) / passo - 0.5);
  return Math.min(Math.max(indice, 0), quantidade - 1);
}

export function segmentosDaSerie(
  serie: Serie,
  xs: readonly number[],
  yDoValor: (valor: number) => number,
): Ponto[][] {
  const segmentos: Ponto[][] = [];
  let atual: Ponto[] = [];
  serie.forEach((valor, i) => {
    if (valor === null || !Number.isFinite(valor) || i >= xs.length) {
      if (atual.length > 0) segmentos.push(atual);
      atual = [];
      return;
    }
    atual.push({ x: xs[i], y: yDoValor(valor) });
  });
  if (atual.length > 0) segmentos.push(atual);
  return segmentos;
}

export interface Corpo {
  x: number;
  y: number;
  largura: number;
  altura: number;
  alta: boolean;
}

export interface Pavio {
  x: number;
  y1: number;
  y2: number;
  alta: boolean;
}

export interface BarraVolume {
  x: number;
  y: number;
  largura: number;
  altura: number;
  alta: boolean;
}

export interface GeometriaCandles {
  xs: number[];
  passo: number;
  yPreco: (preco: number) => number;
  corpos: Corpo[];
  pavios: Pavio[];
  volumes: BarraVolume[];
}

/** Painel de preço no alto (78%) e de volume embaixo, em coordenadas de uma área `largura` × `altura`. */
export function criarGeometriaCandles(
  candles: readonly Candle[],
  largura: number,
  altura: number,
  extras: readonly number[] = [],
): GeometriaCandles {
  const { xs, passo } = posicoesX(candles.length, largura);
  const alturaPreco = altura * FRACAO_PRECO;
  const topoVolume = altura * (FRACAO_PRECO + FRACAO_ESPACO);
  const alturaVolume = altura - topoVolume;

  let minimo = Infinity;
  let maximo = -Infinity;
  for (const candle of candles) {
    minimo = Math.min(minimo, candle.minima);
    maximo = Math.max(maximo, candle.maxima);
  }
  for (const extra of extras) {
    if (!Number.isFinite(extra)) continue;
    minimo = Math.min(minimo, extra);
    maximo = Math.max(maximo, extra);
  }
  if (!Number.isFinite(minimo) || !Number.isFinite(maximo)) {
    minimo = 0;
    maximo = 1;
  }
  if (maximo === minimo) {
    minimo -= 1;
    maximo += 1;
  }
  const folga = (maximo - minimo) * FOLGA_PRECO;
  const topo = maximo + folga;
  const base = minimo - folga;
  const yPreco = (preco: number) => alturaPreco * (1 - (preco - base) / (topo - base));

  const larguraCorpo = Math.max(Math.min(passo * 0.7, 14), 1);
  const volumeMaximo = candles.reduce((maior, candle) => Math.max(maior, candle.volume), 0);

  return {
    xs,
    passo,
    yPreco,
    corpos: candles.map((candle, i) => {
      const yAbertura = yPreco(candle.abertura);
      const yFechamento = yPreco(candle.fechamento);
      return {
        x: xs[i] - larguraCorpo / 2,
        y: Math.min(yAbertura, yFechamento),
        largura: larguraCorpo,
        altura: Math.max(Math.abs(yAbertura - yFechamento), 1),
        alta: candle.fechamento >= candle.abertura,
      };
    }),
    pavios: candles.map((candle, i) => ({
      x: xs[i],
      y1: yPreco(candle.maxima),
      y2: yPreco(candle.minima),
      alta: candle.fechamento >= candle.abertura,
    })),
    volumes: candles.map((candle, i) => {
      const alturaBarra = volumeMaximo > 0 ? (candle.volume / volumeMaximo) * alturaVolume : 0;
      return {
        x: xs[i] - larguraCorpo / 2,
        y: altura - alturaBarra,
        largura: larguraCorpo,
        altura: alturaBarra,
        alta: candle.fechamento >= candle.abertura,
      };
    }),
  };
}

export interface BarraIndicador {
  x: number;
  y: number;
  largura: number;
  altura: number;
  positiva: boolean;
}

export interface GeometriaIndicador {
  yDoValor: (valor: number) => number;
  linhas: Ponto[][][];
  barras: BarraIndicador[];
  referencias: { valor: number; y: number }[];
}

export function criarGeometriaIndicador(args: {
  xs: readonly number[];
  passo: number;
  altura: number;
  series: readonly Serie[];
  barras?: Serie;
  dominio?: readonly [number, number];
  referencias?: readonly number[];
}): GeometriaIndicador {
  const { xs, passo, altura, series, barras = [], referencias = [] } = args;

  let minimo: number;
  let maximo: number;
  if (args.dominio) {
    [minimo, maximo] = args.dominio;
  } else {
    const valores = [...series.flat(), ...barras].filter((v): v is number => v !== null && Number.isFinite(v));
    const magnitude = valores.reduce((maior, valor) => Math.max(maior, Math.abs(valor)), 0) || 1;
    minimo = -magnitude;
    maximo = magnitude;
  }
  const util = Math.max(altura - 2 * MARGEM_VERTICAL_INDICADOR, 1);
  const yDoValor = (valor: number) => MARGEM_VERTICAL_INDICADOR + util * (1 - (valor - minimo) / (maximo - minimo));

  const larguraBarra = Math.max(Math.min(passo * 0.7, 10), 1);
  const y0 = yDoValor(0);

  return {
    yDoValor,
    linhas: series.map((serie) => segmentosDaSerie(serie, xs, yDoValor)),
    barras: barras.flatMap((valor, i) => {
      if (valor === null || !Number.isFinite(valor) || i >= xs.length) return [];
      const y = yDoValor(valor);
      return [{ x: xs[i] - larguraBarra / 2, y: Math.min(y, y0), largura: larguraBarra, altura: Math.abs(y - y0), positiva: valor >= 0 }];
    }),
    referencias: referencias.map((valor) => ({ valor, y: yDoValor(valor) })),
  };
}
```

- [ ] **Step 4: Rodar e ver passar; verificar; commitar**

Run: `npx jest src/dominio/geometriaGrafico.test.ts` → PASS.
Run: `npm run verificar` → exit 0.

```bash
git add src/dominio/geometriaGrafico.ts src/dominio/geometriaGrafico.test.ts
git commit -m "feat(grafico): geometria pura de candles, volume, RSI e MACD com mapeamento de toque" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Aquecimento opcional, valor no disparo e "sem dados"

**Files:**
- Modify: `src/hooks/useAtivo.ts`, `src/components/SinalCard.tsx`, `src/components/dominio.test.tsx`
- Create: `src/dominio/sinais.ts`, `src/dominio/sinais.test.ts`, `src/hooks/aquecimento.test.tsx`

**Interfaces:**
- Produces:
  - `useHistorico(ativoId, periodo, opcoes?: { habilitado?: boolean })`: sem `habilitado` o comportamento é o de hoje
  - `valorNoDisparo(sinal: Sinal): { rotulo: string; valor: string } | null`

- [ ] **Step 1: Escrever os testes (falham)**

`src/dominio/sinais.test.ts`:

```ts
import type { Sinal } from '@/api/tipos';
import { valorNoDisparo } from '@/dominio/sinais';

function sinal(regraId: string, contexto: Record<string, unknown>): Sinal {
  return {
    id: 's-1',
    ativo_id: 'a-1',
    regra_id: regraId,
    regra_nome: 'Regra',
    regra_descricao: 'Descrição',
    data_ativacao: '2026-10-09T13:00:00Z',
    contexto,
    data_desativacao: null,
  };
}

const SOBREVENDA = 'a1a1a1a1-0000-0000-0000-000000000001';
const SOBRECOMPRA = 'a1a1a1a1-0000-0000-0000-000000000002';
const VOLUME = 'a1a1a1a1-0000-0000-0000-000000000003';

describe('valorNoDisparo', () => {
  it('RSI com uma casa decimal', () => {
    expect(valorNoDisparo(sinal(SOBREVENDA, { valor: '28.4' }))).toEqual({ rotulo: 'RSI (14)', valor: '28,4' });
    expect(valorNoDisparo(sinal(SOBRECOMPRA, { valor: '74.31' }))).toEqual({ rotulo: 'RSI (14)', valor: '74,3' });
  });

  it('volume relativo com o ×', () => {
    expect(valorNoDisparo(sinal(VOLUME, { valor: '1.8234' }))).toEqual({
      rotulo: 'Volume relativo (20)',
      valor: '1,82×',
    });
  });

  it('regra desconhecida usa um rótulo genérico', () => {
    expect(valorNoDisparo(sinal('outra', { valor: 5 }))).toEqual({ rotulo: 'Indicador', valor: '5,00' });
  });

  it.each([{}, { valor: 'abc' }, { valor: null }])('contexto sem valor utilizável (%o) é null', (contexto) => {
    expect(valorNoDisparo(sinal(SOBREVENDA, contexto))).toBeNull();
  });
});
```

`src/hooks/aquecimento.test.tsx`:

```tsx
import { renderHook, waitFor } from '@testing-library/react-native';

import { ativosApi } from '@/api/ativos';
import { useHistorico } from '@/hooks/useAtivo';
import { criarProvedor } from '@/test/renderizar';

jest.mock('@/api/ativos', () => ({ ativosApi: { historico: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(ativosApi.historico).mockResolvedValue([]);
});

it('por padrão busca o histórico', async () => {
  const { result } = await renderHook(() => useHistorico('a-1', '1M'), { wrapper: criarProvedor() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(ativosApi.historico).toHaveBeenCalledWith('a-1', '1M');
});

it('habilitado: false não faz a chamada', async () => {
  const { result } = await renderHook(() => useHistorico('a-1', '5A', { habilitado: false }), {
    wrapper: criarProvedor(),
  });
  expect(result.current.fetchStatus).toBe('idle');
  expect(ativosApi.historico).not.toHaveBeenCalled();
});
```

Em `src/components/dominio.test.tsx`, trocar a asserção da linha do SinalCard que espera `'—'` para retorno nulo por `'sem dados'` (`expect(screen.getByText('sem dados')).toBeOnTheScreen();`) e acrescentar, no mesmo `describe` do `SinalCard`, o teste:

```tsx
  it('mostra o valor do indicador no momento do disparo', async () => {
    await render(
      <SinalCard
        sinal={{ ...sinal, regra_id: 'a1a1a1a1-0000-0000-0000-000000000001', contexto: { valor: '28.4' } }}
        carregandoBacktest={false}
      />,
    );
    expect(screen.getByText('RSI (14) no disparo')).toBeOnTheScreen();
    expect(screen.getByText('28,4')).toBeOnTheScreen();
  });
```

(`sinal` é a fixture que o arquivo já usa para o `SinalCard`; se tiver outro nome, usar esse.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/dominio/sinais.test.ts src/hooks/aquecimento.test.tsx src/components/dominio.test.tsx`
Expected: FAIL (`valorNoDisparo` inexistente; `habilitado` ignorado; `'sem dados'` ausente).

- [ ] **Step 3: Implementar**

`src/dominio/sinais.ts`:

```ts
import type { Sinal } from '@/api/tipos';
import { formatarNumero } from '@/utils/formatacao';

// Regras padrão do backend (sem rota de configuração): o `contexto.valor` é o do indicador da regra.
const RSI = 'RSI (14)';
const ROTULO_DA_REGRA: Record<string, string> = {
  'a1a1a1a1-0000-0000-0000-000000000001': RSI,
  'a1a1a1a1-0000-0000-0000-000000000002': RSI,
  'a1a1a1a1-0000-0000-0000-000000000003': 'Volume relativo (20)',
};
const REGRA_VOLUME = 'a1a1a1a1-0000-0000-0000-000000000003';

export function valorNoDisparo(sinal: Sinal): { rotulo: string; valor: string } | null {
  const bruto = sinal.contexto.valor;
  if (typeof bruto !== 'string' && typeof bruto !== 'number') return null;
  const numero = Number(bruto);
  if (bruto === '' || !Number.isFinite(numero)) return null;
  const rotulo = ROTULO_DA_REGRA[sinal.regra_id] ?? 'Indicador';
  if (sinal.regra_id === REGRA_VOLUME) return { rotulo, valor: `${formatarNumero(numero)}×` };
  if (ROTULO_DA_REGRA[sinal.regra_id] === RSI) return { rotulo, valor: formatarNumero(numero, 1) };
  return { rotulo, valor: formatarNumero(numero) };
}
```

`src/hooks/useAtivo.ts`: trocar a assinatura e a query de `useHistorico`:

```ts
export function useHistorico(ativoId: Uuid, periodo: PeriodoHistorico, opcoes: { habilitado?: boolean } = {}) {
  return useQuery<PontoHistorico[], ApiError>({
    queryKey: chaves.historico(ativoId, periodo),
    queryFn: () => ativosApi.historico(ativoId, periodo),
    placeholderData: keepPreviousData,
    enabled: opcoes.habilitado ?? true,
  });
}
```

`src/components/SinalCard.tsx`: importar `valorNoDisparo` de `@/dominio/sinais`; trocar `formatarRetorno` para

```ts
function formatarRetorno(valor: Decimal | null): string {
  return valor === null ? 'sem dados' : formatarPercentual(valor, 'pontos');
}
```

e, dentro do `Card`, logo depois do `Texto` "Ativo desde …", acrescentar:

```tsx
      {disparo ? <Linha rotulo={`${disparo.rotulo} no disparo`} valor={disparo.valor} /> : null}
```

com `const disparo = valorNoDisparo(sinal);` no início do corpo do componente.

- [ ] **Step 4: Rodar e ver passar; verificar; commitar**

Run: `npx jest src/dominio/sinais.test.ts src/hooks/aquecimento.test.tsx src/components/dominio.test.tsx` → PASS.
Run: `npm run verificar` → exit 0.

```bash
git add src/dominio/sinais.ts src/dominio/sinais.test.ts src/hooks/useAtivo.ts src/hooks/aquecimento.test.tsx src/components/SinalCard.tsx src/components/dominio.test.tsx
git commit -m "feat(ativo): valor no disparo do sinal, retorno sem dados e histórico com consulta opcional" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Componentes do gráfico técnico

**Files:**
- Create: `src/components/GraficoCandles.tsx`, `src/components/GraficoIndicador.tsx`, `src/components/AlternadorFiltro.tsx`, `src/components/PainelTecnico.tsx`, `src/components/graficoTecnico.test.tsx`

**Interfaces:**
- Consumes: `AnaliseTecnica` (Tarefa 2); `criarGeometriaCandles`, `criarGeometriaIndicador`, `posicoesX`, `indiceDoX` (Tarefa 3); `formatarData`, `formatarMoeda`, `formatarNumero`.
- Produces (Tarefa 6):
  - `GraficoCandles({ analise, sobreposicoes: Sobreposicoes, indiceSelecionado: number | null, aoSelecionar: (indice: number) => void, altura?: number })`; `type Sobreposicoes = { sma20: boolean; sma50: boolean; sma200: boolean; bollinger: boolean }`
  - `GraficoIndicador({ tipo: 'rsi' | 'macd', analise, indiceSelecionado: number | null, altura?: number })`
  - `AlternadorFiltro({ rotulo: string; ativo: boolean; cor: string; aoAlternar: () => void })` (role `switch`)
  - `PainelTecnico({ analise: AnaliseTecnica; moeda?: string })`

- [ ] **Step 1: Escrever os testes (falham)**

`src/components/graficoTecnico.test.tsx`:

```tsx
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { AlternadorFiltro } from '@/components/AlternadorFiltro';
import { GraficoCandles } from '@/components/GraficoCandles';
import { PainelTecnico } from '@/components/PainelTecnico';
import type { AnaliseTecnica, Candle } from '@/dominio/candles';

// O Skia não é transformável pelo Jest do projeto: a geometria é testada à parte e aqui o desenho é um stub.
jest.mock('@shopify/react-native-skia', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const caminho = () => ({ moveTo: jest.fn(), lineTo: jest.fn(), addRect: jest.fn(), close: jest.fn() });
  return {
    Canvas: View,
    Path: () => null,
    Skia: {
      Path: { Make: caminho },
      XYWHRect: (x: number, y: number, largura: number, altura: number) => ({ x, y, width: largura, height: altura }),
    },
  };
});

const NBSP = '\u00a0';

function candle(indice: number): Candle {
  const fechamento = 100 + indice;
  return {
    data: `2026-09-${String(10 + indice).padStart(2, '0')}`,
    abertura: fechamento - 1,
    maxima: fechamento + 2,
    minima: fechamento - 2,
    fechamento,
    volume: 1000 * (indice + 1),
  };
}

function analise(): AnaliseTecnica {
  const candles = Array.from({ length: 10 }, (_, i) => candle(i));
  const nula = candles.map(() => null);
  return {
    candles,
    sma20: candles.map((c) => c.fechamento - 1),
    sma50: nula,
    sma200: nula,
    bollinger: {
      superior: candles.map((c) => c.fechamento + 5),
      media: candles.map((c) => c.fechamento),
      inferior: candles.map((c) => c.fechamento - 5),
    },
    rsi: candles.map((_, i) => 40 + i),
    macd: {
      linha: candles.map((_, i) => 0.5 + i / 10),
      sinal: candles.map((_, i) => 0.4 + i / 10),
      histograma: candles.map(() => 0.1),
    },
  };
}

const TODAS_DESLIGADAS = { sma20: false, sma50: false, sma200: false, bollinger: false };

function medir(testID: string, largura = 108) {
  fireEvent(screen.getByTestId(testID), 'layout', { nativeEvent: { layout: { width: largura, height: 260 } } });
}

describe('AlternadorFiltro', () => {
  it('é um interruptor acessível', async () => {
    const user = userEvent.setup();
    const alternar = jest.fn();
    await render(<AlternadorFiltro rotulo="SMA 20" ativo cor="#3aa0ff" aoAlternar={alternar} />);
    const botao = screen.getByRole('switch', { name: 'SMA 20' });
    expect(botao).toBeChecked();
    await user.press(botao);
    expect(alternar).toHaveBeenCalledTimes(1);
  });
});

describe('GraficoCandles', () => {
  it('toque e arrasto escolhem o candle sob o dedo', async () => {
    const selecionar = jest.fn();
    await render(
      <GraficoCandles analise={analise()} sobreposicoes={TODAS_DESLIGADAS} indiceSelecionado={null} aoSelecionar={selecionar} />,
    );
    medir('area-candles');
    fireGestureHandler(getByGestureTestId('candles-arrasto'), [{ x: 39 }, { x: 39 }]);
    expect(selecionar).toHaveBeenLastCalledWith(3);
    fireGestureHandler(getByGestureTestId('candles-arrasto'), [{ x: 500 }, { x: 500 }]);
    expect(selecionar).toHaveBeenLastCalledWith(9);
  });

  it('descreve o gráfico para leitores de tela', async () => {
    await render(
      <GraficoCandles analise={analise()} sobreposicoes={TODAS_DESLIGADAS} indiceSelecionado={null} aoSelecionar={jest.fn()} />,
    );
    expect(screen.getByLabelText(/Gráfico de candles de 10\/09\/2026 a 19\/09\/2026/)).toBeOnTheScreen();
  });
});

describe('PainelTecnico', () => {
  it('mostra o último candle por padrão, com data, preços e indicadores', async () => {
    await render(<PainelTecnico analise={analise()} moeda="BRL" />);
    expect(screen.getByText('19/09/2026')).toBeOnTheScreen();
    expect(screen.getByText(`Fechamento R$${NBSP}109,00`)).toBeOnTheScreen();
    expect(screen.getByText('RSI (14): 49,0')).toBeOnTheScreen();
  });

  it('tocar num candle troca os valores mostrados', async () => {
    await render(<PainelTecnico analise={analise()} moeda="BRL" />);
    medir('area-candles');
    fireGestureHandler(getByGestureTestId('candles-arrasto'), [{ x: 9 }, { x: 9 }]);
    expect(await screen.findByText('10/09/2026')).toBeOnTheScreen();
    expect(screen.getByText(`Fechamento R$${NBSP}100,00`)).toBeOnTheScreen();
    expect(screen.getByText('RSI (14): 40,0')).toBeOnTheScreen();
  });

  it('médias e Bollinger são alternáveis; SMA 20 e SMA 50 começam ligadas', async () => {
    const user = userEvent.setup();
    await render(<PainelTecnico analise={analise()} moeda="BRL" />);
    expect(screen.getByRole('switch', { name: 'SMA 20' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'SMA 50' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'SMA 200' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Bollinger' })).not.toBeChecked();
    await user.press(screen.getByRole('switch', { name: 'Bollinger' }));
    expect(screen.getByRole('switch', { name: 'Bollinger' })).toBeChecked();
  });

  it('valor ausente do indicador aparece como traço, nunca zero', async () => {
    const base = analise();
    const semRsi = { ...base, rsi: base.rsi.map(() => null) };
    await render(<PainelTecnico analise={semRsi} moeda="BRL" />);
    expect(screen.getByText('RSI (14): —')).toBeOnTheScreen();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/components/graficoTecnico.test.tsx`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar os componentes**

`src/components/AlternadorFiltro.tsx`:

```tsx
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/Texto';
import { espaco, raio } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  rotulo: string;
  ativo: boolean;
  /** Cor da linha que o interruptor liga no gráfico (legenda). */
  cor: string;
  aoAlternar: () => void;
}

export function AlternadorFiltro({ rotulo, ativo, cor, aoAlternar }: Props) {
  const { cores } = useTema();
  return (
    <Pressable
      role="switch"
      aria-label={rotulo}
      aria-checked={ativo}
      onPress={aoAlternar}
      style={[
        estilos.chip,
        { borderColor: ativo ? cor : cores.bordaForte, backgroundColor: ativo ? cores.superficieAlta : 'transparent' },
      ]}
    >
      <View style={[estilos.marcador, { backgroundColor: cor, opacity: ativo ? 1 : 0.4 }]} />
      <Texto variante="legenda" negrito={ativo} cor={ativo ? 'padrao' : 'secundario'}>
        {rotulo}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    borderWidth: 1,
    borderRadius: raio.pilula,
    paddingHorizontal: espaco.md,
  },
  marcador: { width: 14, height: 3, borderRadius: 2 },
});
```

`src/components/GraficoCandles.tsx`:

```tsx
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import type { AnaliseTecnica } from '@/dominio/candles';
import {
  criarGeometriaCandles,
  indiceDoX,
  type Ponto,
  segmentosDaSerie,
} from '@/dominio/geometriaGrafico';
import type { Serie } from '@/dominio/series';
import { useTema } from '@/theme/useTema';
import { formatarData } from '@/utils/formatacao';

export type Sobreposicoes = { sma20: boolean; sma50: boolean; sma200: boolean; bollinger: boolean };

interface Props {
  analise: AnaliseTecnica;
  sobreposicoes: Sobreposicoes;
  indiceSelecionado: number | null;
  aoSelecionar: (indice: number) => void;
  altura?: number;
}

function caminhoDeLinhas(segmentos: Ponto[][]) {
  const caminho = Skia.Path.Make();
  for (const segmento of segmentos) {
    segmento.forEach((ponto, i) => (i === 0 ? caminho.moveTo(ponto.x, ponto.y) : caminho.lineTo(ponto.x, ponto.y)));
  }
  return caminho;
}

function caminhoDeRetangulos(retangulos: { x: number; y: number; largura: number; altura: number }[]) {
  const caminho = Skia.Path.Make();
  for (const r of retangulos) caminho.addRect(Skia.XYWHRect(r.x, r.y, r.largura, r.altura));
  return caminho;
}

function valoresFinitos(serie: Serie): number[] {
  return serie.filter((valor): valor is number => valor !== null && Number.isFinite(valor));
}

/** Candles + volume + médias/Bollinger. O gráfico só desenha o que `criarGeometriaCandles` calcula. */
export function GraficoCandles({ analise, sobreposicoes, indiceSelecionado, aoSelecionar, altura = 260 }: Props) {
  const { grafico, cores } = useTema();
  const [largura, setLargura] = useState(0);
  const { candles } = analise;

  const linhasVisiveis = useMemo(() => {
    const lista: { serie: Serie; cor: string }[] = [];
    if (sobreposicoes.sma20) lista.push({ serie: analise.sma20, cor: grafico.sma20 });
    if (sobreposicoes.sma50) lista.push({ serie: analise.sma50, cor: grafico.sma50 });
    if (sobreposicoes.sma200) lista.push({ serie: analise.sma200, cor: grafico.sma200 });
    if (sobreposicoes.bollinger) {
      lista.push({ serie: analise.bollinger.superior, cor: grafico.eixo });
      lista.push({ serie: analise.bollinger.media, cor: grafico.eixo });
      lista.push({ serie: analise.bollinger.inferior, cor: grafico.eixo });
    }
    return lista;
  }, [analise, sobreposicoes, grafico]);

  const desenho = useMemo(() => {
    if (largura <= 0) return null;
    const extras = linhasVisiveis.flatMap(({ serie }) => valoresFinitos(serie));
    const geometria = criarGeometriaCandles(candles, largura, altura, extras);
    return {
      geometria,
      corposAlta: caminhoDeRetangulos(geometria.corpos.filter((c) => c.alta)),
      corposBaixa: caminhoDeRetangulos(geometria.corpos.filter((c) => !c.alta)),
      paviosAlta: caminhoDeLinhas(
        geometria.pavios.filter((p) => p.alta).map((p) => [{ x: p.x, y: p.y1 }, { x: p.x, y: p.y2 }]),
      ),
      paviosBaixa: caminhoDeLinhas(
        geometria.pavios.filter((p) => !p.alta).map((p) => [{ x: p.x, y: p.y1 }, { x: p.x, y: p.y2 }]),
      ),
      volumesAlta: caminhoDeRetangulos(geometria.volumes.filter((v) => v.alta)),
      volumesBaixa: caminhoDeRetangulos(geometria.volumes.filter((v) => !v.alta)),
      linhas: linhasVisiveis.map(({ serie, cor }) => ({
        cor,
        caminho: caminhoDeLinhas(segmentosDaSerie(serie, geometria.xs, geometria.yPreco)),
      })),
    };
  }, [candles, largura, altura, linhasVisiveis]);

  function selecionar(x: number) {
    if (largura > 0 && candles.length > 0) aoSelecionar(indiceDoX(x, candles.length, largura));
  }

  // Arrasto horizontal escolhe o candle; deslocamento vertical passa para a rolagem da tela.
  const arrasto = Gesture.Pan()
    .withTestId('candles-arrasto')
    .runOnJS(true)
    .activeOffsetX([-8, 8])
    .failOffsetY([-12, 12])
    .onBegin((evento) => selecionar(evento.x))
    .onUpdate((evento) => selecionar(evento.x));
  const toque = Gesture.Tap()
    .withTestId('candles-toque')
    .runOnJS(true)
    .onEnd((evento) => selecionar(evento.x));
  const gesto = Gesture.Race(arrasto, toque);

  const xSelecionado =
    desenho && indiceSelecionado !== null ? desenho.geometria.xs[Math.min(indiceSelecionado, candles.length - 1)] : null;
  const mira = useMemo(() => {
    if (xSelecionado === null || xSelecionado === undefined) return null;
    return caminhoDeLinhas([[{ x: xSelecionado, y: 0 }, { x: xSelecionado, y: altura }]]);
  }, [xSelecionado, altura]);

  const descricao = `Gráfico de candles de ${formatarData(candles[0].data)} a ${formatarData(
    candles[candles.length - 1].data,
  )}, ${candles.length} candles. Toque ou arraste para ver os valores de cada dia.`;

  return (
    <GestureDetector gesture={gesto}>
      <View
        testID="area-candles"
        aria-label={descricao}
        accessible
        style={[estilos.area, { height: altura }]}
        onLayout={(evento: LayoutChangeEvent) => setLargura(evento.nativeEvent.layout.width)}
      >
        {desenho ? (
          <Canvas style={estilos.canvas}>
            <Path path={desenho.volumesAlta} color={grafico.alta} opacity={0.3} style="fill" />
            <Path path={desenho.volumesBaixa} color={grafico.baixa} opacity={0.3} style="fill" />
            {desenho.linhas.map(({ caminho, cor }, i) => (
              <Path key={i} path={caminho} color={cor} style="stroke" strokeWidth={1.5} />
            ))}
            <Path path={desenho.paviosAlta} color={grafico.alta} style="stroke" strokeWidth={1} />
            <Path path={desenho.paviosBaixa} color={grafico.baixa} style="stroke" strokeWidth={1} />
            <Path path={desenho.corposAlta} color={grafico.alta} style="fill" />
            <Path path={desenho.corposBaixa} color={grafico.baixa} style="fill" />
            {mira ? <Path path={mira} color={cores.textoSecundario} style="stroke" strokeWidth={1} opacity={0.8} /> : null}
          </Canvas>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const estilos = StyleSheet.create({
  area: { width: '100%' },
  canvas: { flex: 1 },
});
```

`src/components/GraficoIndicador.tsx`:

```tsx
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import type { AnaliseTecnica } from '@/dominio/candles';
import { criarGeometriaIndicador, type Ponto, posicoesX } from '@/dominio/geometriaGrafico';
import { useTema } from '@/theme/useTema';

interface Props {
  tipo: 'rsi' | 'macd';
  analise: AnaliseTecnica;
  indiceSelecionado: number | null;
  altura?: number;
}

function caminhoDeLinhas(segmentos: Ponto[][]) {
  const caminho = Skia.Path.Make();
  for (const segmento of segmentos) {
    segmento.forEach((ponto, i) => (i === 0 ? caminho.moveTo(ponto.x, ponto.y) : caminho.lineTo(ponto.x, ponto.y)));
  }
  return caminho;
}

/** RSI (0–100, referências em 30 e 70) ou MACD (linha, sinal e histograma), na mesma coluna dos candles. */
export function GraficoIndicador({ tipo, analise, indiceSelecionado, altura = 110 }: Props) {
  const { grafico, cores } = useTema();
  const [largura, setLargura] = useState(0);
  const quantidade = analise.candles.length;

  const desenho = useMemo(() => {
    if (largura <= 0) return null;
    const { xs, passo } = posicoesX(quantidade, largura);
    const geometria =
      tipo === 'rsi'
        ? criarGeometriaIndicador({ xs, passo, altura, series: [analise.rsi], dominio: [0, 100], referencias: [30, 70] })
        : criarGeometriaIndicador({ xs, passo, altura, series: [analise.macd.linha, analise.macd.sinal], barras: analise.macd.histograma });
    const retangulos = (positivas: boolean) => {
      const caminho = Skia.Path.Make();
      for (const barra of geometria.barras.filter((b) => b.positiva === positivas)) {
        caminho.addRect(Skia.XYWHRect(barra.x, barra.y, barra.largura, barra.altura));
      }
      return caminho;
    };
    const cores2 = tipo === 'rsi' ? [grafico.sma20] : [grafico.sma20, grafico.sma50];
    return {
      xs,
      referencias: geometria.referencias.map((r) => caminhoDeLinhas([[{ x: 0, y: r.y }, { x: largura, y: r.y }]])),
      zero: caminhoDeLinhas([[{ x: 0, y: geometria.yDoValor(0) }, { x: largura, y: geometria.yDoValor(0) }]]),
      barrasPositivas: retangulos(true),
      barrasNegativas: retangulos(false),
      linhas: geometria.linhas.map((segmentos, i) => ({ caminho: caminhoDeLinhas(segmentos), cor: cores2[i] })),
    };
  }, [analise, tipo, largura, altura, quantidade, grafico]);

  const xSelecionado =
    desenho && indiceSelecionado !== null ? desenho.xs[Math.min(indiceSelecionado, quantidade - 1)] : null;
  const mira = useMemo(
    () =>
      xSelecionado === null || xSelecionado === undefined
        ? null
        : caminhoDeLinhas([[{ x: xSelecionado, y: 0 }, { x: xSelecionado, y: altura }]]),
    [xSelecionado, altura],
  );

  return (
    <View
      testID={`area-${tipo}`}
      accessible
      aria-label={tipo === 'rsi' ? 'Gráfico do RSI (14), com referências em 30 e 70' : 'Gráfico do MACD (12, 26, 9)'}
      style={[estilos.area, { height: altura }]}
      onLayout={(evento: LayoutChangeEvent) => setLargura(evento.nativeEvent.layout.width)}
    >
      {desenho ? (
        <Canvas style={estilos.canvas}>
          {tipo === 'rsi'
            ? desenho.referencias.map((caminho, i) => (
                <Path key={i} path={caminho} color={grafico.eixo} style="stroke" strokeWidth={1} opacity={0.7} />
              ))
            : [
                <Path key="zero" path={desenho.zero} color={grafico.eixo} style="stroke" strokeWidth={1} opacity={0.7} />,
                <Path key="pos" path={desenho.barrasPositivas} color={grafico.alta} style="fill" opacity={0.6} />,
                <Path key="neg" path={desenho.barrasNegativas} color={grafico.baixa} style="fill" opacity={0.6} />,
              ]}
          {desenho.linhas.map(({ caminho, cor }, i) => (
            <Path key={`l${i}`} path={caminho} color={cor} style="stroke" strokeWidth={1.5} />
          ))}
          {mira ? <Path path={mira} color={cores.textoSecundario} style="stroke" strokeWidth={1} opacity={0.8} /> : null}
        </Canvas>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  area: { width: '100%' },
  canvas: { flex: 1 },
});
```

`src/components/PainelTecnico.tsx`:

```tsx
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlternadorFiltro } from '@/components/AlternadorFiltro';
import { GraficoCandles, type Sobreposicoes } from '@/components/GraficoCandles';
import { GraficoIndicador } from '@/components/GraficoIndicador';
import { Texto } from '@/components/Texto';
import type { AnaliseTecnica } from '@/dominio/candles';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';
import { formatarData, formatarMoeda, formatarNumero } from '@/utils/formatacao';

interface Props {
  analise: AnaliseTecnica;
  moeda?: string;
}

function numero(valor: number | null | undefined, casas = 2): string {
  return valor === null || valor === undefined ? '—' : formatarNumero(valor, casas);
}

/** Candles, RSI e MACD com uma mira única: tocar num candle mostra os valores de todos os indicadores naquele dia. */
export function PainelTecnico({ analise, moeda }: Props) {
  const { grafico } = useTema();
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [sobreposicoes, setSobreposicoes] = useState<Sobreposicoes>({
    sma20: true,
    sma50: true,
    sma200: false,
    bollinger: false,
  });

  const total = analise.candles.length;
  const indice = Math.min(selecionado ?? total - 1, total - 1);
  const candle = analise.candles[indice];
  const alternar = (chave: keyof Sobreposicoes) => setSobreposicoes((atual) => ({ ...atual, [chave]: !atual[chave] }));

  return (
    <View style={estilos.painel}>
      <View style={estilos.filtros}>
        <AlternadorFiltro rotulo="SMA 20" ativo={sobreposicoes.sma20} cor={grafico.sma20} aoAlternar={() => alternar('sma20')} />
        <AlternadorFiltro rotulo="SMA 50" ativo={sobreposicoes.sma50} cor={grafico.sma50} aoAlternar={() => alternar('sma50')} />
        <AlternadorFiltro rotulo="SMA 200" ativo={sobreposicoes.sma200} cor={grafico.sma200} aoAlternar={() => alternar('sma200')} />
        <AlternadorFiltro rotulo="Bollinger" ativo={sobreposicoes.bollinger} cor={grafico.eixo} aoAlternar={() => alternar('bollinger')} />
      </View>

      <View style={estilos.leitura} accessibilityLiveRegion="polite">
        <Texto negrito>{formatarData(candle.data)}</Texto>
        <Texto variante="legenda" cor="secundario">{`Abertura ${formatarMoeda(candle.abertura, moeda)}`}</Texto>
        <Texto variante="legenda" cor="secundario">{`Máxima ${formatarMoeda(candle.maxima, moeda)}`}</Texto>
        <Texto variante="legenda" cor="secundario">{`Mínima ${formatarMoeda(candle.minima, moeda)}`}</Texto>
        <Texto variante="legenda" cor="secundario">{`Fechamento ${formatarMoeda(candle.fechamento, moeda)}`}</Texto>
        <Texto variante="legenda" cor="secundario">{`Volume ${formatarNumero(candle.volume, 0)}`}</Texto>
      </View>

      <GraficoCandles analise={analise} sobreposicoes={sobreposicoes} indiceSelecionado={selecionado} aoSelecionar={setSelecionado} />

      <Texto variante="legenda" cor="secundario">{`RSI (14): ${numero(analise.rsi[indice], 1)}`}</Texto>
      <GraficoIndicador tipo="rsi" analise={analise} indiceSelecionado={selecionado} />

      <Texto variante="legenda" cor="secundario">
        {`MACD: ${numero(analise.macd.linha[indice])} · Sinal: ${numero(analise.macd.sinal[indice])} · Histograma: ${numero(
          analise.macd.histograma[indice],
        )}`}
      </Texto>
      <GraficoIndicador tipo="macd" analise={analise} indiceSelecionado={selecionado} />
    </View>
  );
}

const estilos = StyleSheet.create({
  painel: { gap: espaco.md },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  leitura: { gap: 2 },
});
```

- [ ] **Step 4: Rodar, ajustar e ver passar**

Run: `npx jest src/components/graficoTecnico.test.tsx`
Expected: PASS. Se a asserção `Fechamento R$ 109,00` falhar porque o texto está dividido, o componente deve produzir uma única string por `Texto` (como acima). Se `fireGestureHandler` não encontrar o gesto composto, os `testId` ficam nos gestos individuais (já estão): conferir que `GestureDetector` envolve a `View` com `testID="area-candles"`.

- [ ] **Step 5: Verificar e commitar**

Run: `npm run verificar` → exit 0.

```bash
git add src/components/AlternadorFiltro.tsx src/components/GraficoCandles.tsx src/components/GraficoIndicador.tsx src/components/PainelTecnico.tsx src/components/graficoTecnico.test.tsx
git commit -m "feat(grafico): candles com volume e médias, RSI e MACD com mira por toque" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Detalhe do ativo com o gráfico técnico

**Files:**
- Modify: `app/ativo/[id].tsx`, `__tests__/telas/ativo.test.tsx`, `src/components/GraficoDistribuicao.tsx` (nada: só confirmar que não depende dos arquivos removidos)
- Delete: `src/components/GraficoPreco.tsx`, `src/dominio/graficos.ts`, `src/dominio/graficos.test.ts`

**Interfaces:**
- Consumes: `useHistorico(..., { habilitado })` (Tarefa 4), `prepararAnaliseTecnica` (Tarefa 2), `PainelTecnico` (Tarefa 5).

- [ ] **Step 1: Escrever/atualizar os testes (falham)**

Em `__tests__/telas/ativo.test.tsx`:

1. Trocar o mock `jest.mock('@/components/GraficoPreco', () => ({ GraficoPreco: () => null }));` por:

```tsx
jest.mock('@/components/PainelTecnico', () => ({
  PainelTecnico: ({ analise }: { analise: { candles: unknown[] } }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{`painel com ${analise.candles.length} candles`}</Text>;
  },
}));
```

2. Acrescentar, num novo `describe('gráfico técnico', ...)` (reutilizando os helpers do arquivo para renderizar `DetalheAtivo` com `prepararAtivoNaWatchlist()` e `ativosApi.*` mockados), estes testes:

```tsx
function ponto(dia: number, fechamento: number) {
  const data = new Date(Date.UTC(2026, 8, dia)).toISOString();
  return { data, abertura: String(fechamento), maxima: String(fechamento + 1), minima: String(fechamento - 1), fechamento: String(fechamento), volume: '100' };
}

describe('gráfico técnico', () => {
  it('mostra o painel quando o histórico tem candles suficientes', async () => {
    prepararAtivoNaWatchlist();
    jest.mocked(ativosApi.historico).mockResolvedValue([ponto(1, 10), ponto(2, 11), ponto(3, 12)]);
    await renderizar(<DetalheAtivo />);
    expect(await screen.findByText('painel com 3 candles')).toBeOnTheScreen();
  });

  it('pede também o histórico 5A como aquecimento das médias', async () => {
    prepararAtivoNaWatchlist();
    jest.mocked(ativosApi.historico).mockResolvedValue([ponto(1, 10), ponto(2, 11)]);
    await renderizar(<DetalheAtivo />);
    await screen.findByText('painel com 2 candles');
    expect(ativosApi.historico).toHaveBeenCalledWith('a-1', '1M');
    expect(ativosApi.historico).toHaveBeenCalledWith('a-1', '5A');
  });

  it('o gráfico aparece mesmo se o aquecimento 5A falhar', async () => {
    prepararAtivoNaWatchlist();
    jest.mocked(ativosApi.historico).mockImplementation(async (_id: string, periodo: string) => {
      if (periodo === '5A') throw new ApiError(503, 'Fonte de dados de mercado indisponivel');
      return [ponto(1, 10), ponto(2, 11)];
    });
    await renderizar(<DetalheAtivo />);
    expect(await screen.findByText('painel com 2 candles')).toBeOnTheScreen();
  });

  it('1D explica que é um único ponto e não desenha candles', async () => {
    const user = userEvent.setup();
    prepararAtivoNaWatchlist();
    jest.mocked(ativosApi.historico).mockImplementation(async (_id: string, periodo: string) =>
      periodo === '1D' ? [ponto(3, 12)] : [ponto(1, 10), ponto(2, 11)],
    );
    await renderizar(<DetalheAtivo />);
    await screen.findByText('painel com 2 candles');
    await user.press(screen.getByRole('radio', { name: '1D' }));
    expect(await screen.findByText(/1D mostra só a cotação atual/)).toBeOnTheScreen();
    expect(screen.queryByText(/painel com/)).not.toBeOnTheScreen();
  });

  it('histórico com um único dia não desenha e explica', async () => {
    prepararAtivoNaWatchlist();
    jest.mocked(ativosApi.historico).mockResolvedValue([ponto(1, 10)]);
    await renderizar(<DetalheAtivo />);
    expect(await screen.findByText('Dados insuficientes para o gráfico neste período.')).toBeOnTheScreen();
  });

  it('erro do histórico mostra a mensagem com tentar de novo', async () => {
    prepararAtivoNaWatchlist();
    jest.mocked(ativosApi.historico).mockRejectedValue(new ApiError(0, 'Sem conexão com o servidor (http://api)', { causa: 'rede' }));
    await renderizar(<DetalheAtivo />);
    expect(await screen.findByText('Sem conexão com o servidor (http://api)')).toBeOnTheScreen();
  });
});
```

(Os nomes `prepararAtivoNaWatchlist`, `ApiError`, `userEvent`, `screen`, `renderizar`, `DetalheAtivo` e `ativosApi` já existem no arquivo; se algum import faltar, acrescentar.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest __tests__/telas/ativo.test.tsx`
Expected: FAIL (a tela ainda usa `GraficoPreco`; os testes novos não acham "painel com …").

- [ ] **Step 3: Alterar `app/ativo/[id].tsx`**

1. Imports: remover `GraficoPreco` e `prepararSeriePreco`; acrescentar:

```tsx
import { useMemo, useState } from 'react';
import { Carregando } from '@/components/Carregando';
import { PainelTecnico } from '@/components/PainelTecnico';
import { prepararAnaliseTecnica } from '@/dominio/candles';
```

2. Depois de `const historico = useHistorico(id, periodo);` acrescentar o aquecimento e a análise:

```tsx
  // As médias e o RSI precisam de registros anteriores ao período: o histórico 5A (o que o backend guardou) aquece o cálculo.
  const precisaAquecimento = periodo !== '1D' && periodo !== '5A';
  const aquecimento = useHistorico(id, '5A', { habilitado: precisaAquecimento && historico.isSuccess });
  const emTransicao = historico.isPlaceholderData;
  const analise = useMemo(
    () =>
      historico.data && !emTransicao
        ? prepararAnaliseTecnica(historico.data, precisaAquecimento ? aquecimento.data : undefined)
        : null,
    [historico.data, emTransicao, aquecimento.data, precisaAquecimento],
  );
```

3. Trocar o `Card titulo="Histórico de fechamento"` inteiro por:

```tsx
        <Card titulo="Gráfico técnico" icone="tendencia">
          <SeletorSegmentado rotulo="Período do gráfico" opcoes={PERIODOS} selecionado={periodo} aoSelecionar={setPeriodo} />
          {emTransicao ? (
            <Carregando />
          ) : (
            <EstadoConsulta
              consulta={historico}
              mensagemErro={(erro) => (ehStatus(erro, 404) ? 'Histórico indisponível para este ativo.' : undefined)}
            >
              {() =>
                analise ? (
                  <PainelTecnico key={periodo} analise={analise} moeda={ativo?.moeda} />
                ) : (
                  <EstadoVazio
                    mensagem={
                      periodo === '1D'
                        ? '1D mostra só a cotação atual (um ponto). Escolha 1S ou mais para ver os candles.'
                        : 'Dados insuficientes para o gráfico neste período.'
                    }
                  />
                )
              }
            </EstadoConsulta>
          )}
        </Card>
```

4. Remover os arquivos mortos:

```bash
git rm -q src/components/GraficoPreco.tsx src/dominio/graficos.ts src/dominio/graficos.test.ts
grep -rn "GraficoPreco\|dominio/graficos\|prepararSeriePreco\|corDaVariacao" app src __tests__ | head
```

Expected: nenhuma ocorrência restante.

- [ ] **Step 4: Rodar e ver passar; verificar; commitar**

Run: `npx jest __tests__/telas/ativo.test.tsx` → PASS.
Run: `npm run verificar` → exit 0.

```bash
git add "app/ativo/[id].tsx" __tests__/telas/ativo.test.tsx
git commit -m "feat(ativo): gráfico técnico no detalhe com aquecimento 5A, 1D explicado e erro tratado" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Busca com adição explícita à watchlist

**Files:**
- Modify: `app/buscar.tsx`, `src/components/LinhaResultadoBusca.tsx`, `src/components/Icone.tsx`, `__tests__/telas/buscar.test.tsx`, `src/components/listas.test.tsx`

**Interfaces:**
- Produces: `LinhaResultadoBusca({ ativo, aoPressionar, naWatchlist?: boolean })`; ícone `confirmado`.

- [ ] **Step 1: Escrever/atualizar os testes (falham)**

Em `src/components/listas.test.tsx`, acrescentar no fim:

```tsx
describe('LinhaResultadoBusca (watchlist)', () => {
  const encontrado = { ticker: 'VALE3', nome: 'Vale ON', tipo: 'ACAO' as const, moeda: 'BRL', setor: null };

  it('sem estar na watchlist convida a adicionar', async () => {
    await render(<LinhaResultadoBusca ativo={encontrado} aoPressionar={jest.fn()} />);
    expect(screen.getByText('Adicionar à watchlist')).toBeOnTheScreen();
  });

  it('na watchlist mostra o selo e abre o ativo', async () => {
    await render(<LinhaResultadoBusca ativo={encontrado} naWatchlist aoPressionar={jest.fn()} />);
    expect(screen.getByText('Na watchlist')).toBeOnTheScreen();
    expect(screen.queryByText('Adicionar à watchlist')).not.toBeOnTheScreen();
  });
});
```

Em `__tests__/telas/buscar.test.tsx`:

1. Acrescentar `import { Alert } from 'react-native';` e um helper no topo (depois dos mocks):

```tsx
/** Confirma o diálogo "Adicionar à watchlist" tocando no botão de ação. */
function confirmarAdicao() {
  jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensagem, botoes) => {
    botoes?.find((botao) => botao.text === 'Adicionar')?.onPress?.();
  });
}
```

2. Nos testes `'escolher um resultado adiciona à watchlist e abre o ativo'`, `'toque duplo no mesmo resultado adiciona e navega uma única vez'` e `'o erro da tentativa anterior some ao digitar um novo termo'`, chamar `confirmarAdicao();` depois de `userEvent.setup()`.

3. Acrescentar:

```tsx
it('pede confirmação antes de adicionar e não adiciona se cancelar', async () => {
  const user = userEvent.setup();
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(ativosApi.buscar).mockResolvedValue([petr]);
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  await renderizar(<Buscar />);
  await user.type(screen.getByLabelText('Ticker ou nome'), 'PETR');
  await user.press(await screen.findByRole('button', { name: 'PETR4, Petrobras PN' }, { timeout: TEMPO_DA_BUSCA_MS }));
  expect(alerta).toHaveBeenCalledWith(
    'Adicionar à watchlist',
    expect.stringContaining('PETR4'),
    expect.arrayContaining([expect.objectContaining({ text: 'Adicionar' })]),
  );
  expect(watchlistApi.adicionar).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});

it('ativo que já está na watchlist abre direto, sem diálogo nem nova adição', async () => {
  const user = userEvent.setup();
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(ativosApi.buscar).mockResolvedValue([petr]);
  jest.mocked(watchlistApi.listar).mockResolvedValue([itemDaWatchlist]);
  await renderizar(<Buscar />);
  await user.type(screen.getByLabelText('Ticker ou nome'), 'PETR');
  expect(await screen.findByText('Na watchlist', undefined, { timeout: TEMPO_DA_BUSCA_MS })).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'PETR4, Petrobras PN' }));
  expect(alerta).not.toHaveBeenCalled();
  expect(watchlistApi.adicionar).not.toHaveBeenCalled();
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1', ticker: 'PETR4' } });
});
```

(`itemDaWatchlist` é declarado no meio do arquivo, antes dos testes que o usam; mover a declaração para o topo se o novo teste vier antes.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest __tests__/telas/buscar.test.tsx src/components/listas.test.tsx`
Expected: FAIL (sem diálogo, sem selo "Na watchlist").

- [ ] **Step 3: Implementar**

`src/components/Icone.tsx`: acrescentar `Check,` ao import do `lucide-react-native` (ordem alfabética, depois de `CirclePlus,`... `Check` vem antes de `ChartPie`? manter ordem alfabética: `Bell, BellOff, ChartPie, Check, Circle, ...`) e `confirmado: Check,` ao mapa.

`src/components/LinhaResultadoBusca.tsx`:

```tsx
import { Pressable, StyleSheet, View } from 'react-native';

import type { AtivoEncontrado } from '@/api/tipos';
import { Icone } from '@/components/Icone';
import { Texto } from '@/components/Texto';
import { ROTULO_TIPO_ATIVO } from '@/dominio/rotulos';
import { espaco } from '@/theme/escala';
import { useTema } from '@/theme/useTema';

interface Props {
  ativo: AtivoEncontrado;
  aoPressionar: () => void;
  /** Já está na watchlist: tocar abre o ativo; senão, tocar pede para adicionar. */
  naWatchlist?: boolean;
}

export function LinhaResultadoBusca({ ativo, aoPressionar, naWatchlist = false }: Props) {
  const { cores } = useTema();
  return (
    <Pressable
      role="button"
      aria-label={`${ativo.ticker}, ${ativo.nome}`}
      onPress={aoPressionar}
      style={({ pressed }) => [estilos.linha, { borderColor: cores.borda, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={estilos.textos}>
        <Texto negrito>{ativo.ticker}</Texto>
        <Texto numberOfLines={1}>{ativo.nome}</Texto>
        <Texto variante="legenda" cor="secundario">{`${ROTULO_TIPO_ATIVO[ativo.tipo]} · ${ativo.moeda}`}</Texto>
      </View>
      <View style={estilos.acao}>
        <Icone nome={naWatchlist ? 'confirmado' : 'mais-circulo'} tamanho={22} cor={naWatchlist ? 'positivo' : 'primaria'} />
        <Texto variante="legenda" cor={naWatchlist ? 'positivo' : 'primaria'}>
          {naWatchlist ? 'Na watchlist' : 'Adicionar à watchlist'}
        </Texto>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingVertical: espaco.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textos: { flex: 1, gap: 2 },
  acao: { alignItems: 'center', gap: 2, maxWidth: 96 },
});
```

`app/buscar.tsx`:

1. Imports: `import { Alert, FlatList, StyleSheet, View } from 'react-native';` e `import { useWatchlist } from '@/hooks/useWatchlist';`.
2. Dentro do componente, depois de `const resolver = useResolverAtivo();`:

```tsx
  const watchlist = useWatchlist();
  const porTicker = new Map((watchlist.data ?? []).map((item) => [item.ativo.ticker.toUpperCase(), item.ativo.id]));
```

3. Trocar `aoEscolher` por:

```tsx
  async function adicionarEAbrir(ativo: AtivoEncontrado) {
    setErro(null);
    try {
      const { ativoId } = await resolver.mutateAsync(ativo.ticker);
      router.replace({ pathname: '/ativo/[id]', params: { id: ativoId, ticker: ativo.ticker } });
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    }
  }

  function aoEscolher(ativo: AtivoEncontrado) {
    // A lista segue tocável durante a adição: ignora toques até a resolução terminar (evita duas adições e duas navegações).
    if (resolver.isPending) return;
    const idNaWatchlist = porTicker.get(ativo.ticker.toUpperCase());
    if (idNaWatchlist) {
      router.replace({ pathname: '/ativo/[id]', params: { id: idNaWatchlist, ticker: ativo.ticker } });
      return;
    }
    // Adição explícita: o ativo só entra na watchlist (e ganha análise) com a confirmação do usuário.
    Alert.alert('Adicionar à watchlist', `Adicionar ${ativo.ticker} à sua watchlist para ver o gráfico e a análise?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Adicionar', onPress: () => void adicionarEAbrir(ativo) },
    ]);
  }
```

4. No `renderItem`:

```tsx
        renderItem={({ item }) => (
          <LinhaResultadoBusca
            ativo={item}
            naWatchlist={porTicker.has(item.ticker.toUpperCase())}
            aoPressionar={() => aoEscolher(item)}
          />
        )}
```

- [ ] **Step 4: Rodar e ver passar; verificar; commitar**

Run: `npx jest __tests__/telas/buscar.test.tsx src/components/listas.test.tsx src/components/icone.test.tsx` → PASS.
Run: `npm run verificar` → exit 0.

```bash
git add app/buscar.tsx src/components/LinhaResultadoBusca.tsx src/components/Icone.tsx __tests__/telas/buscar.test.tsx src/components/listas.test.tsx
git commit -m "feat(busca): adição explícita à watchlist com confirmação e selo para ativos já adicionados" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Conferência dos indicadores calculados contra a API real

**Files:**
- Create: `src/dominio/__fixtures__/indicadores-api.json`, `src/dominio/contratoIndicadores.test.ts`

**Interfaces:**
- Consumes: `prepararAnaliseTecnica` (Tarefa 2).

Critério da etapa (`docs/PLANO.md` §8): o último valor de SMA 20/50, RSI 14 e Bollinger calculados no app bate com `/indicadores`, com tolerância de 0,01.

- [ ] **Step 1: Capturar a fixture com o backend local**

Com o backend em `http://localhost:8000` (`docker compose up -d`), criar um usuário descartável, adicionar `PETR4` e `BTC` à watchlist e salvar, para cada ativo, o histórico `5A` (só `data` e `fechamento`, em listas compactas) e a resposta de `/indicadores` no mesmo instante. Salvar em `src/dominio/__fixtures__/indicadores-api.json`:

```json
{
  "capturadoEm": "<ISO da captura>",
  "ativos": {
    "PETR4": { "historico": [["2026-09-12T03:00:00Z", "38.42"]], "indicadores": [ { "tipo": "RSI", "parametros": { "periodo": 14 }, "valor": "...", "valores_auxiliares": null } ] },
    "BTC": { "historico": [["2026-09-12T00:00:00Z", "351234.10"]], "indicadores": [] }
  }
}
```

(os arrays reais saem do script de captura; o exemplo acima só mostra a forma.)

- [ ] **Step 2: Escrever o teste**

`src/dominio/contratoIndicadores.test.ts`:

```ts
import type { IndicadorTecnico, PontoHistorico } from '@/api/tipos';
import { prepararAnaliseTecnica } from '@/dominio/candles';

import fixture from './__fixtures__/indicadores-api.json';

type Registro = { historico: [string, string][]; indicadores: IndicadorTecnico[] };

function pontos(historico: [string, string][]): PontoHistorico[] {
  return historico.map(([data, fechamento]) => ({
    data,
    abertura: fechamento,
    maxima: fechamento,
    minima: fechamento,
    fechamento,
    volume: '0',
  }));
}

function oficial(indicadores: IndicadorTecnico[], tipo: string, periodo?: number): IndicadorTecnico | undefined {
  return indicadores.find((i) => i.tipo === tipo && (periodo === undefined || i.parametros.periodo === periodo));
}

const TOLERANCIA = 0.01;

describe.each(Object.entries(fixture.ativos as Record<string, Registro>))('%s: séries do app × /indicadores', (_ticker, registro) => {
  const historico = pontos(registro.historico);
  const analise = prepararAnaliseTecnica(historico, historico)!;
  const ultimo = analise.candles.length - 1;

  it.each([
    ['SMA', 20, () => analise.sma20[ultimo]],
    ['SMA', 50, () => analise.sma50[ultimo]],
    ['SMA', 200, () => analise.sma200[ultimo]],
    ['RSI', 14, () => analise.rsi[ultimo]],
  ] as const)('%s %d', (tipo, periodo, calculado) => {
    const esperado = oficial(registro.indicadores, tipo, periodo);
    if (!esperado) return; // histórico curto demais: a API omite o indicador
    expect(calculado()).not.toBeNull();
    expect(Math.abs((calculado() as number) - Number(esperado.valor))).toBeLessThanOrEqual(TOLERANCIA);
  });

  it('Bollinger (20, 2): média e bandas', () => {
    const esperado = oficial(registro.indicadores, 'BOLLINGER');
    if (!esperado?.valores_auxiliares) return;
    expect(Math.abs((analise.bollinger.media[ultimo] as number) - Number(esperado.valor))).toBeLessThanOrEqual(TOLERANCIA);
    expect(Math.abs((analise.bollinger.superior[ultimo] as number) - esperado.valores_auxiliares.banda_superior)).toBeLessThanOrEqual(TOLERANCIA);
    expect(Math.abs((analise.bollinger.inferior[ultimo] as number) - esperado.valores_auxiliares.banda_inferior)).toBeLessThanOrEqual(TOLERANCIA);
  });

  it('MACD (12, 26, 9): linha, sinal e histograma', () => {
    const esperado = oficial(registro.indicadores, 'MACD');
    if (!esperado?.valores_auxiliares) return;
    expect(Math.abs((analise.macd.linha[ultimo] as number) - Number(esperado.valor))).toBeLessThanOrEqual(TOLERANCIA);
    expect(Math.abs((analise.macd.sinal[ultimo] as number) - esperado.valores_auxiliares.linha_sinal)).toBeLessThanOrEqual(TOLERANCIA);
    expect(Math.abs((analise.macd.histograma[ultimo] as number) - esperado.valores_auxiliares.histograma)).toBeLessThanOrEqual(TOLERANCIA);
  });
});
```

- [ ] **Step 3: Rodar**

Run: `npx jest src/dominio/contratoIndicadores.test.ts`
Expected: PASS. Se algum indicador divergir mais que 0,01, **não afrouxar a tolerância**: registrar a divergência (qual indicador, valores) e corrigir a fórmula da Tarefa 1 com um teste que reproduza o caso; se o backend não estiver acessível, registrar no ledger que a conferência ficou pendente e deixar o arquivo de teste com `describe.skip` comentando o motivo.

- [ ] **Step 4: Verificar e commitar**

Run: `npm run verificar` → exit 0.

```bash
git add src/dominio/__fixtures__/indicadores-api.json src/dominio/contratoIndicadores.test.ts
git commit -m "test(grafico): séries do app conferidas com os indicadores oficiais da API (tolerância 0,01)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Documentação e PR

**Files:**
- Modify: `README.md`, `docs/PLANO.md`, `docs/checkpoint-02.md`

- [ ] **Step 1: Atualizar a documentação**

- `README.md`, "Funcionalidades": trocar o item "Detalhe do ativo: gráfico de fechamento (1D a 5A), …" por: `- Detalhe do ativo: candles com volume, médias móveis e Bollinger alternáveis, mira por toque, RSI (30/70) e MACD (1D a 5A), indicadores técnicos oficiais e sinais com o valor no disparo e o histórico da condição (5, 20 e 60 pregões)`; e o item da busca: `Busca de ativos com adição explícita à watchlist`.
- `docs/PLANO.md`, linha da Etapa 4 do §8: acrescentar ao fim do "Critério de pronto" ` **Feito em 10/10/2026** (PR da Etapa 4); falta conferir o toque no aparelho.`
- `docs/checkpoint-02.md`, §1 "O que foi implementado": acrescentar `- Detalhe do ativo com gráfico de candles (volume, médias móveis, Bollinger, RSI e MACD) e mira por toque; busca com adição explícita à watchlist.` e, na tabela da §6, trocar a linha "Interface com Flexbox" para citar também `src/components/PainelTecnico.tsx` e `GraficoCandles.tsx`.

- [ ] **Step 2: Verificar, commitar, enviar e abrir o PR**

Run: `npm run verificar` → exit 0.

```bash
git add README.md docs/PLANO.md docs/checkpoint-02.md
git commit -m "docs: detalhe do ativo e busca na documentação e no checkpoint" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
export GH_TOKEN="$(gh auth token --user brunoosouza09)"
git push -u origin feature/etapa-4-detalhe-do-ativo
gh pr create -R InsightF-AI/Insight-flow-mobile --base feature/etapa-3-inicio --head feature/etapa-4-detalhe-do-ativo \
  --title "feat: Etapa 4 — gráfico técnico no detalhe do ativo e busca com adição explícita" --body-file - <<'EOF'
<resumo, verificação e limites; preencher com o resultado real antes de executar>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

(Antes de executar, substituir a linha `<resumo...>` pelo texto real: o que muda, `npm run verificar` com contagem, o que a conferência com a API mostrou, "toque no aparelho não testado" e os menores adiados da revisão.)

- [ ] **Step 3: Resumo para o usuário**

Responder com: o que foi feito; o resultado da conferência contra a API; o que depende do aparelho (toque, desempenho do Skia em 1A/5A); menores adiados; e o próximo passo (Etapa 5: alertas e notificações).

---

## Registro da execução (10/10/2026)

Executado inline, tarefa a tarefa, com revisão independente da branch inteira no fim. O código final difere do que está nas tarefas acima nos pontos abaixo (a revisão e a verificação com dados reais corrigiram o plano).

**Resultado:** 57 suítes / 638 testes; `npm run verificar` verde. Os indicadores calculados no app batem com `/indicadores` da API local (SMA 20/50/200, RSI 14, Bollinger, MACD, tolerância 0,01) em PETR4, VALE3, BTC e ETH, inclusive com o período recortado e o 5A como aquecimento (`src/dominio/contratoIndicadores.test.ts`). Os desenhos foram conferidos com o Skia real (CanvasKit em Node) e saem corretos.

**Decisões que divergem do plano**

- **Task 2 — `prepararAnaliseTecnica`.** O código do plano devolvia `null` quando o aquecimento terminava antes do período e perdia candles recentes com o 5A em cache defasado. Passou a usar o prefixo do aquecimento (candles anteriores ao período, contíguos em até 10 dias) mais os candles exibidos, que são sempre os do período.
- **Task 2 — texto vazio.** `Number('')` é 0: preço vazio descarta o ponto em vez de virar zero.
- **Revisão — RSI e MACD.** São recursivos; calculados só sobre o período começavam em valores plausíveis porém errados (RSI 26,4 contra 33,3 oficial na captura da VALE3). Só são calculados com o aquecimento contíguo ou quando o período já começa no primeiro registro do histórico; fora disso ficam sem valor e o painel explica o motivo. No período 5A o próprio histórico é o completo.
- **Task 5.** MACD e RSI usam `cores.primaria`/`cores.destaque` (não as cores das médias). Os gestos ficam em `useMemo` e a seleção acontece só em `onUpdate`/`onEnd`, para que tocar para rolar a tela não mova a mira.
- **Task 6.** O 5A de aquecimento corre em paralelo ao histórico do período (não espera por ele).
- **Task 8.** A captura usa PETR4, VALE3, BTC e ETH: cripto vem do catálogo de pares BRL da Binance (ticker `BTC`, não `BTC-USD`); a B3 só tem cerca de 64 pregões (sem SMA 200) e a cripto 1000 candles.
- **Revisão — Skia.** `Path.moveTo/lineTo/addRect` estão deprecated no Skia 2.x; os caminhos saem do `PathBuilder` (`src/components/caminhosSkia.ts`).
- **Revisão — selo.** "Na watchlist" deixou de usar verde.

**Menores adiados (da revisão)**

- A escala do gráfico degenera com série parada por resíduo de ponto flutuante (`maximo === minimo` exato; 20 ou mais pregões idênticos com a SMA ligada). Usar epsilon relativo.
- Trocar de período zera as escolhas de SMA e Bollinger (o `key={periodo}` remonta o painel). Subir o estado para a tela.
- O `aria-label` da linha de busca esconde de leitores de tela o selo "Na watchlist"/"Adicionar à watchlist".
- Busca: com a watchlist carregando ou falhando, o diálogo pergunta se adiciona um ativo que já está nela; o `onPress` do `Alert` não tem guarda de `isPending`.
- O volume de cripto é arredondado para inteiro (0,42 BTC aparece como "Volume 0").
- O interruptor SMA 200 liga sem desenhar nada na B3; a leitura da mira não mostra as médias nem o Bollinger.
- Testes: o `Tap` nunca é exercitado, não há teste de tela para a troca de período e a tolerância do contrato (0,01) é frouxa diante da concordância real (1e-14).
- O aviso `act(...)` de `__tests__/telas/perfil.test.tsx` é anterior a esta etapa.

**Não verificado (depende do aparelho):** se o arrasto horizontal convive com a rolagem vertical e o `RefreshControl` no Android e no iOS; quadros por segundo com 1000 candles e três painéis; contraste das linhas de Bollinger e de referência em captura de tela.
