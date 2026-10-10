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

  it('preço vazio não vira zero: o ponto é descartado', () => {
    const candles = prepararCandles([
      ponto('2026-09-12T03:00:00Z', 10, { maxima: '' }),
      ponto('2026-09-13T03:00:00Z', 11),
    ]);
    expect(candles.map((c) => c.data)).toEqual(['2026-09-13']);
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
    // índice 50 do completo: média dos fechamentos nos índices 31..50 → 100+31 … 100+50
    const esperado = Array.from({ length: 20 }, (_, i) => 131 + i).reduce((a, b) => a + b, 0) / 20;
    expect(analise?.sma20[0]).toBeCloseTo(esperado, 8);
    expect(analise?.sma50[0]).not.toBeNull();
    expect(analise?.rsi[0]).not.toBeNull();
    expect(analise?.macd.linha[0]).not.toBeNull();
  });

  it('as séries têm o mesmo tamanho dos candles exibidos', () => {
    const completo = serieDiaria(60);
    const analise = prepararAnaliseTecnica(completo.slice(-10), completo);
    expect(analise).not.toBeNull();
    const a = analise!;
    for (const serie of [
      a.sma20,
      a.sma50,
      a.sma200,
      a.bollinger.superior,
      a.bollinger.media,
      a.bollinger.inferior,
      a.rsi,
      a.macd.linha,
      a.macd.sinal,
      a.macd.histograma,
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

  it('aquecimento defasado (termina antes do último dia exibido) não faz o gráfico perder candles', () => {
    const completo = serieDiaria(60);
    const exibido = serieDiaria(15, 50);
    const analise = prepararAnaliseTecnica(exibido, completo);
    expect(analise?.candles).toHaveLength(15);
    expect(analise?.candles[14].data).toBe(prepararCandles(exibido)[14].data);
    expect(analise?.sma20[0]).not.toBeNull();
  });
});
