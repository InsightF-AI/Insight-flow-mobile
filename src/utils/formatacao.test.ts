import {
  dataParaISOLocal,
  formatarData,
  formatarDataHora,
  formatarMoeda,
  formatarNumero,
  formatarPercentual,
  formatarQuantidade,
  formatarVolume,
  normalizarDecimal,
  paraNumero,
} from '@/utils/formatacao';

const NBSP = ' ';

describe('paraNumero', () => {
  it('converte a string decimal do backend', () => {
    expect(paraNumero('123.45')).toBe(123.45);
  });

  it('mantém number', () => {
    expect(paraNumero(7)).toBe(7);
  });
});

describe('formatarNumero', () => {
  it('usa separadores pt-BR com 2 casas', () => {
    expect(formatarNumero('1234.5')).toBe('1.234,50');
  });

  it('respeita a quantidade de casas', () => {
    expect(formatarNumero(28.456, 1)).toBe('28,5');
  });
});

describe('formatarQuantidade', () => {
  it('não mostra casas em inteiros', () => {
    expect(formatarQuantidade('1500')).toBe('1.500');
  });

  it('preserva frações de cripto', () => {
    expect(formatarQuantidade('0.00123')).toBe('0,00123');
  });
});

describe('formatarMoeda', () => {
  it('formata BRL', () => {
    expect(formatarMoeda('1234.5', 'BRL')).toBe(`R$${NBSP}1.234,50`);
  });

  it('formata USD', () => {
    expect(formatarMoeda(10, 'USD')).toBe(`US$${NBSP}10,00`);
  });

  it('sem moeda formata só o número', () => {
    expect(formatarMoeda('3.5')).toBe('3,50');
  });

  it('código de moeda inválido não quebra a tela', () => {
    expect(formatarMoeda(1, 'XX')).toBe('XX 1,00');
  });
});

describe('formatarPercentual', () => {
  it('pontos percentuais positivos ganham +', () => {
    expect(formatarPercentual('1.23', 'pontos')).toBe('+1,23%');
  });

  it('fração vira percentual', () => {
    expect(formatarPercentual('0.05', 'fracao')).toBe('+5,00%');
  });

  it('negativo mostra -', () => {
    expect(formatarPercentual('-2.5', 'pontos')).toBe('-2,50%');
  });

  it('zero não tem sinal', () => {
    expect(formatarPercentual('0', 'fracao')).toBe('0,00%');
  });

  it('valor que arredonda para zero não tem sinal', () => {
    expect(formatarPercentual(-0.001, 'pontos')).toBe('0,00%');
  });

  it('a mesma entrada difere 100x entre as escalas', () => {
    expect(formatarPercentual('0.4', 'fracao')).toBe('+40,00%');
    expect(formatarPercentual('0.4', 'pontos')).toBe('+0,40%');
  });
});

describe('datas', () => {
  it('data sem hora não sofre deslocamento de fuso', () => {
    expect(formatarData('2026-09-25')).toBe('25/09/2026');
  });

  it('data e hora são exibidas no fuso local', () => {
    expect(formatarDataHora('2026-09-25T15:30:00Z')).toBe('25/09/2026 12:30');
  });

  it('dataParaISOLocal usa o dia local, não o dia UTC', () => {
    // 23:30 em São Paulo já é 26/09 em UTC.
    expect(dataParaISOLocal(new Date(2026, 8, 25, 23, 30))).toBe('2026-09-25');
  });
});

describe('formatarVolume', () => {
  it.each([
    [0.42, '0,42'],
    [12.5, '12,5'],
    [0, '0'],
    [999.5, '999,5'],
    [1000, '1.000'],
    [1234.4, '1.234'],
    [1234567.89, '1.234.568'],
    ['0.0042', '0,0042'],
  ])('volume %p vira "%s"', (volume, esperado) => {
    expect(formatarVolume(volume)).toBe(esperado);
  });
});

describe('normalizarDecimal', () => {
  it('aceita vírgula decimal', () => {
    expect(normalizarDecimal(' 10,5 ')).toBe('10.5');
  });

  it('aceita ponto decimal', () => {
    expect(normalizarDecimal('3.25')).toBe('3.25');
  });

  it('aceita inteiro', () => {
    expect(normalizarDecimal('100')).toBe('100');
  });

  it.each(['', 'abc', '1.234,56', '-1', '1e3'])('rejeita %p', (entrada) => {
    expect(normalizarDecimal(entrada)).toBeNull();
  });
});
