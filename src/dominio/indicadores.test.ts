import type { IndicadorTecnico, TipoIndicador } from '@/api/tipos';
import { descreverIndicadores } from '@/dominio/indicadores';

function indicador(
  tipo: TipoIndicador,
  valor: string,
  parametros: Record<string, number>,
  valoresAuxiliares: Record<string, number> | null = null,
): IndicadorTecnico {
  return { tipo, valor, parametros, valores_auxiliares: valoresAuxiliares, data_calculo: '2026-09-25T12:00:00Z' };
}

describe('RSI', () => {
  it('abaixo de 30 descreve sobrevenda', () => {
    const [rsi] = descreverIndicadores([indicador('RSI', '28.44', { periodo: 14 })], 10);
    expect(rsi).toMatchObject({ titulo: 'RSI 14', valor: '28,4', descricao: 'Zona de sobrevenda (abaixo de 30)' });
  });

  it('acima de 70 descreve sobrecompra', () => {
    const [rsi] = descreverIndicadores([indicador('RSI', '75', { periodo: 14 })], 10);
    expect(rsi.descricao).toBe('Zona de sobrecompra (acima de 70)');
  });

  it.each(['30', '50', '70'])('%s é zona neutra (limiares estritos, como no backend)', (valor) => {
    const [rsi] = descreverIndicadores([indicador('RSI', valor, { periodo: 14 })], 10);
    expect(rsi.descricao).toBe('Zona neutra (entre 30 e 70)');
  });
});

describe('SMA', () => {
  const sma20 = indicador('SMA', '20', { periodo: 20 });

  it('compara com o preço atual', () => {
    expect(descreverIndicadores([sma20], 25)[0].descricao).toBe('Preço atual acima da média');
    expect(descreverIndicadores([sma20], 15)[0].descricao).toBe('Preço atual abaixo da média');
    expect(descreverIndicadores([sma20], 20)[0].descricao).toBe('Preço atual no nível da média');
  });

  it('sem cotação avisa que não há comparação', () => {
    expect(descreverIndicadores([sma20], null)[0].descricao).toBe('Sem cotação atual para comparar');
  });
});

it('MACD mostra sinal, histograma e a relação entre as linhas', () => {
  const [macd] = descreverIndicadores(
    [indicador('MACD', '0.3', { rapida: 12, lenta: 26, sinal: 9 }, { linha_sinal: 0.5, histograma: -0.2 })],
    10,
  );
  expect(macd).toMatchObject({
    titulo: 'MACD 12/26/9',
    valor: '0,30',
    descricao: 'Sinal 0,50 · Histograma -0,20 — linha MACD abaixo da linha de sinal',
  });
});

it('Bollinger posiciona o preço em relação às bandas', () => {
  const bollinger = indicador('BOLLINGER', '35', { periodo: 20, desvios: 2 }, { banda_superior: 40, banda_inferior: 30 });
  expect(descreverIndicadores([bollinger], 29)[0]).toMatchObject({
    titulo: 'Bollinger 20/2',
    descricao: 'Superior 40,00 · Inferior 30,00 — preço abaixo da banda inferior',
  });
  expect(descreverIndicadores([bollinger], 41)[0].descricao).toContain('preço acima da banda superior');
  expect(descreverIndicadores([bollinger], 35)[0].descricao).toContain('preço dentro das bandas');
});

it('volume relativo em múltiplos da média', () => {
  const [volume] = descreverIndicadores([indicador('VOLUME_RELATIVO', '1.8', { periodo: 20 })], 10);
  expect(volume).toMatchObject({
    titulo: 'Volume relativo 20',
    valor: '1,80×',
    descricao: 'Volume 1,80× a média de 20 pregões',
  });
});

it('ordena SMAs por período antes dos demais indicadores', () => {
  const titulos = descreverIndicadores(
    [
      indicador('VOLUME_RELATIVO', '1', { periodo: 20 }),
      indicador('RSI', '50', { periodo: 14 }),
      indicador('SMA', '10', { periodo: 200 }),
      indicador('SMA', '10', { periodo: 20 }),
    ],
    10,
  ).map((item) => item.titulo);
  expect(titulos).toEqual(['SMA 20', 'SMA 200', 'RSI 14', 'Volume relativo 20']);
});

it('nenhum texto usa verbo de recomendação (RN-01)', () => {
  const todos = [
    indicador('SMA', '20', { periodo: 20 }),
    indicador('RSI', '20', { periodo: 14 }),
    indicador('RSI', '80', { periodo: 14 }),
    indicador('MACD', '1', { rapida: 12, lenta: 26, sinal: 9 }, { linha_sinal: 0.5, histograma: 0.5 }),
    indicador('BOLLINGER', '35', { periodo: 20, desvios: 2 }, { banda_superior: 40, banda_inferior: 30 }),
    indicador('VOLUME_RELATIVO', '2', { periodo: 20 }),
  ];
  for (const preco of [null, 10, 35, 50]) {
    for (const item of descreverIndicadores(todos, preco)) {
      expect(`${item.titulo} ${item.descricao}`).not.toMatch(/\b(compre|comprar|venda|vender|invista|investir)\b/i);
    }
  }
});
