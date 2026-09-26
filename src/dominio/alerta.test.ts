import { descreverCondicao, validarAlerta } from '@/dominio/alerta';

const NBSP = ' ';

it('descreve a condição com a moeda do alerta', () => {
  expect(descreverCondicao('PRECO_MAIOR_IGUAL', '40', 'BRL')).toBe(`Preço ≥ R$${NBSP}40,00`);
  expect(descreverCondicao('PRECO_MENOR_IGUAL', '10.5', 'USD')).toBe(`Preço ≤ US$${NBSP}10,50`);
});

describe('validarAlerta', () => {
  it('normaliza ticker e valor', () => {
    expect(validarAlerta({ ticker: ' vale3 ', tipoCondicao: 'PRECO_MENOR_IGUAL', valorAlvo: '61,5' })).toEqual({
      ok: true,
      dados: { ticker: 'VALE3', tipo_condicao: 'PRECO_MENOR_IGUAL', valor_alvo: '61.5' },
    });
  });

  it('exige ticker e valor maior que zero', () => {
    expect(validarAlerta({ ticker: '', tipoCondicao: 'PRECO_MAIOR_IGUAL', valorAlvo: '0' })).toEqual({
      ok: false,
      erros: { ticker: 'Informe o ticker do ativo', valorAlvo: 'Informe um valor maior que zero' },
    });
  });

  it('limita o ticker a 20 caracteres (regra do backend)', () => {
    const resultado = validarAlerta({ ticker: 'A'.repeat(21), tipoCondicao: 'PRECO_MAIOR_IGUAL', valorAlvo: '1' });
    expect(resultado).toEqual({ ok: false, erros: { ticker: 'Use no máximo 20 caracteres' } });
  });
});
