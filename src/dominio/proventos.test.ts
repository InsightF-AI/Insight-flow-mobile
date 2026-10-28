import { somaDosUltimos12Meses } from '@/dominio/proventos';

describe('somaDosUltimos12Meses', () => {
  const hoje = new Date(2026, 9, 28);

  it('soma só o que tem data-ex dentro dos últimos 12 meses', () => {
    const proventos = [
      { data_ex: '2026-10-01', valor_por_cota: '0.50' },
      { data_ex: '2026-04-15', valor_por_cota: '0.25' },
      { data_ex: '2025-10-28', valor_por_cota: '0.10' },
      { data_ex: '2025-10-27', valor_por_cota: '9.99' },
    ];
    expect(somaDosUltimos12Meses(proventos, hoje)).toBeCloseTo(0.85);
  });

  it('ignora data-ex futura e lista vazia', () => {
    expect(somaDosUltimos12Meses([{ data_ex: '2026-11-05', valor_por_cota: '1' }], hoje)).toBe(0);
    expect(somaDosUltimos12Meses([], hoje)).toBe(0);
  });
});
