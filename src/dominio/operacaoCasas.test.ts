import { validarOperacao } from '@/dominio/operacao';

const HOJE = new Date(2026, 9, 10, 12, 0, 0);
const BASE = { tipo: 'COMPRA' as const, ticker: 'PETR4', quantidade: '10', precoUnitario: '38,5', data: HOJE };

// O backend grava quantidade e preço em Numeric(18, 6): mais casas são arredondadas em silêncio (0,0000001 vira 0 e uma
// operação com quantidade zero derruba o cálculo da carteira inteira).
describe('validarOperacao: no máximo 6 casas decimais', () => {
  it('seis casas passam', () => {
    expect(validarOperacao({ ...BASE, quantidade: '0,000001', precoUnitario: '1,123456' }, HOJE).ok).toBe(true);
  });

  it('quantidade com sete casas é recusada', () => {
    expect(validarOperacao({ ...BASE, quantidade: '0,0000001' }, HOJE)).toEqual({
      ok: false,
      erros: { quantidade: 'Use no máximo 6 casas decimais' },
    });
  });

  it('preço com sete casas é recusado', () => {
    expect(validarOperacao({ ...BASE, precoUnitario: '1,2345678' }, HOJE)).toEqual({
      ok: false,
      erros: { precoUnitario: 'Use no máximo 6 casas decimais' },
    });
  });

  it('zeros à direita além da sexta casa não contam como casa', () => {
    expect(validarOperacao({ ...BASE, quantidade: '1,500000000' }, HOJE).ok).toBe(true);
  });
});
