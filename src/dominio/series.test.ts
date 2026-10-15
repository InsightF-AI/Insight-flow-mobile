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
