import type { Rentabilidade } from '@/api/tipos';
import { kpiLucroRealizado } from '@/dominio/inicio';

const NBSP = ' ';

function rentabilidade(parcial: Partial<Rentabilidade>): Rentabilidade {
  return {
    custo_base_brl: '300',
    valor_mercado_brl: '330',
    lucro_nao_realizado_brl: '30',
    lucro_realizado_brl: '0',
    percentual: '0.1',
    ...parcial,
  };
}

describe('kpiLucroRealizado', () => {
  it('lucro realizado positivo em BRL, verde', () => {
    expect(kpiLucroRealizado(rentabilidade({ lucro_realizado_brl: '125.5' }))).toEqual({
      valor: `R$${NBSP}125,50`,
      dica: 'Em vendas já registradas',
      cor: 'positivo',
    });
  });

  it('prejuízo realizado fica vermelho', () => {
    expect(kpiLucroRealizado(rentabilidade({ lucro_realizado_brl: '-40' })).cor).toBe('negativo');
  });

  it('sem vendas é zero neutro, não verde', () => {
    const kpi = kpiLucroRealizado(rentabilidade({ lucro_realizado_brl: '0' }));
    expect(kpi.valor).toBe(`R$${NBSP}0,00`);
    expect(kpi.cor).toBe('padrao');
  });

  it('carteira sem operações mostra traço', () => {
    const vazia = rentabilidade({ custo_base_brl: '0', valor_mercado_brl: '0', lucro_realizado_brl: '0' });
    expect(kpiLucroRealizado(vazia)).toEqual({ valor: '—', dica: 'Registre uma operação simulada', cor: 'padrao' });
  });

  it('o lucro realizado não depende de haver cotação das posições abertas', () => {
    const semCotacao = rentabilidade({ valor_mercado_brl: '0', lucro_realizado_brl: '80' });
    expect(kpiLucroRealizado(semCotacao).valor).toBe(`R$${NBSP}80,00`);
  });
});
