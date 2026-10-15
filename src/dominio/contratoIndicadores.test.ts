import type { IndicadorTecnico, PontoHistorico } from '@/api/tipos';
import { prepararAnaliseTecnica } from '@/dominio/candles';

import fixture from './__fixtures__/indicadores-api.json';

/**
 * Critério de pronto da Etapa 4 (docs/PLANO.md §8): o último valor de SMA 20/50/200, RSI 14, Bollinger e MACD
 * calculados no app bate com `GET /ativos/{id}/indicadores`, tolerância 0,01. A fixture é uma captura real do
 * backend local (histórico 5A e indicadores do mesmo instante), de B3 (poucos pregões) e de cripto (1000 candles).
 */
type IndicadorOficial = Pick<IndicadorTecnico, 'tipo' | 'parametros' | 'valor' | 'valores_auxiliares'>;
type Captura = { historico: [string, string][]; indicadores: IndicadorOficial[] };

const TOLERANCIA = 0.01;
const ativos = (fixture as unknown as { ativos: Record<string, Captura> }).ativos;

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

function oficial(indicadores: IndicadorOficial[], tipo: string, periodo?: number): IndicadorOficial | undefined {
  return indicadores.find((i) => i.tipo === tipo && (periodo === undefined || i.parametros.periodo === periodo));
}

function bate(calculado: number | null | undefined, esperado: number): void {
  expect(calculado).not.toBeNull();
  expect(calculado).toBeDefined();
  expect(Math.abs((calculado as number) - esperado)).toBeLessThanOrEqual(TOLERANCIA);
}

it('a fixture tem B3 e cripto, com o histórico de cada ativo', () => {
  expect(Object.keys(ativos).length).toBeGreaterThanOrEqual(2);
  for (const captura of Object.values(ativos)) expect(captura.historico.length).toBeGreaterThan(20);
});

describe.each(Object.entries(ativos))('%s: séries do app × /indicadores', (_ticker, captura) => {
  const historico = pontos(captura.historico);
  // Exibido = o histórico inteiro: o último candle é o mesmo sobre o qual a API calculou.
  const analise = prepararAnaliseTecnica(historico, historico);
  const ultimo = (analise?.candles.length ?? 1) - 1;

  it('tem análise calculada', () => {
    expect(analise).not.toBeNull();
  });

  for (const [rotulo, periodo] of [
    ['sma20', 20],
    ['sma50', 50],
    ['sma200', 200],
  ] as const) {
    it(`SMA ${periodo}`, () => {
      const esperado = oficial(captura.indicadores, 'SMA', periodo);
      const calculado = analise?.[rotulo][ultimo] ?? null;
      if (esperado) bate(calculado, Number(esperado.valor));
      else expect(calculado).toBeNull(); // sem registros suficientes: nem a API nem o app inventam valor
    });
  }

  it('RSI (14)', () => {
    const esperado = oficial(captura.indicadores, 'RSI', 14);
    const calculado = analise?.rsi[ultimo] ?? null;
    if (esperado) bate(calculado, Number(esperado.valor));
    else expect(calculado).toBeNull();
  });

  it('Bollinger (20, 2): média e bandas', () => {
    const esperado = oficial(captura.indicadores, 'BOLLINGER');
    if (!esperado?.valores_auxiliares) {
      expect(analise?.bollinger.media[ultimo] ?? null).toBeNull();
      return;
    }
    bate(analise?.bollinger.media[ultimo], Number(esperado.valor));
    bate(analise?.bollinger.superior[ultimo], esperado.valores_auxiliares.banda_superior);
    bate(analise?.bollinger.inferior[ultimo], esperado.valores_auxiliares.banda_inferior);
  });

  it('MACD (12, 26, 9): linha, sinal e histograma', () => {
    const esperado = oficial(captura.indicadores, 'MACD');
    if (!esperado?.valores_auxiliares) {
      expect(analise?.macd.linha[ultimo] ?? null).toBeNull();
      return;
    }
    bate(analise?.macd.linha[ultimo], Number(esperado.valor));
    bate(analise?.macd.sinal[ultimo], esperado.valores_auxiliares.linha_sinal);
    bate(analise?.macd.histograma[ultimo], esperado.valores_auxiliares.histograma);
  });
});

describe.each(Object.entries(ativos))('%s: período recortado (como no app) × /indicadores', (_ticker, captura) => {
  const historico = pontos(captura.historico);
  const recorte = historico.slice(-22);

  it('com o histórico 5A de aquecimento, RSI e MACD do último dia batem com os oficiais', () => {
    const analise = prepararAnaliseTecnica(recorte, historico);
    expect(analise?.candles).toHaveLength(22);
    expect(analise?.rsiMacdCalculados).toBe(true);
    const ultimo = 21;
    const rsi = oficial(captura.indicadores, 'RSI', 14);
    const macd = oficial(captura.indicadores, 'MACD');
    if (rsi) bate(analise?.rsi[ultimo], Number(rsi.valor));
    if (macd?.valores_auxiliares) {
      bate(analise?.macd.linha[ultimo], Number(macd.valor));
      bate(analise?.macd.sinal[ultimo], macd.valores_auxiliares.linha_sinal);
      bate(analise?.macd.histograma[ultimo], macd.valores_auxiliares.histograma);
    }
  });

  it('sem o aquecimento RSI e MACD ficam sem valor em vez de começar errados', () => {
    const analise = prepararAnaliseTecnica(recorte);
    expect(analise?.rsiMacdCalculados).toBe(false);
    expect(analise?.rsi.every((v) => v === null)).toBe(true);
    expect(analise?.macd.linha.every((v) => v === null)).toBe(true);
    // As de janela fixa não mudam: SMA 20 e Bollinger do último dia seguem batendo com os oficiais.
    const sma20 = oficial(captura.indicadores, 'SMA', 20);
    if (sma20) bate(analise?.sma20[21], Number(sma20.valor));
  });
});
