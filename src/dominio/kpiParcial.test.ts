import type { Rentabilidade } from '@/api/tipos';
import { kpiPatrimonio, kpiResultado, kpiVariacaoDoDia } from '@/dominio/inicio';
import { percentualDaCarteiraConfiavel } from '@/dominio/portfolio';

const NBSP = ' ';

/** O que o backend devolve com um ativo cotado (custo 1000, valor 1100) e outro sem cotação (custo 5000): soma o custo
 * do segundo e omite o valor de mercado dele. */
const PARCIAL: Rentabilidade = {
  custo_base_brl: '6000',
  valor_mercado_brl: '1100',
  lucro_nao_realizado_brl: '-4900',
  lucro_realizado_brl: '0',
  percentual: '-0.8166666667',
};

const COMPLETA: Rentabilidade = {
  custo_base_brl: '1000',
  valor_mercado_brl: '1100',
  lucro_nao_realizado_brl: '100',
  lucro_realizado_brl: '0',
  percentual: '0.1',
};

describe('KPIs com ativo sem cotação (queda parcial da fonte de preços)', () => {
  it('o resultado não realizado é "indisponível", nunca um prejuízo vermelho que não existe', () => {
    expect(kpiResultado(PARCIAL, 1)).toEqual({
      valor: 'indisponível',
      dica: 'Sem cotação de 1 ativo',
      cor: 'padrao',
    });
    expect(kpiResultado(PARCIAL, 2).dica).toBe('Sem cotação de 2 ativos');
  });

  it('o patrimônio mostra o valor das posições cotadas e diz que é parcial', () => {
    expect(kpiPatrimonio(PARCIAL, 1)).toEqual({
      valor: `R$${NBSP}1.100,00`,
      dica: 'Parcial: 1 ativo sem cotação',
      cor: 'padrao',
    });
  });

  it('a variação do dia diz que cobre só as posições cotadas', () => {
    const v = { pontos: 1.5, consideradas: 2, total: 2 };
    expect(kpiVariacaoDoDia(v, false, 1).dica).toBe('Só das posições cotadas');
    expect(kpiVariacaoDoDia(v, false, 0).dica).toBe('Ponderada pelo valor em BRL');
  });

  it('sem ativo sem cotação nada muda', () => {
    expect(kpiResultado(COMPLETA).cor).toBe('positivo');
    expect(kpiResultado(COMPLETA, 0).dica).toBe('+10,00%');
    expect(kpiPatrimonio(COMPLETA, 0).dica).toBe(`Custo R$${NBSP}1.000,00`);
  });
});

describe('percentualDaCarteiraConfiavel', () => {
  it('com posições abertas e todas cotadas é confiável', () => {
    expect(percentualDaCarteiraConfiavel(COMPLETA, 0)).toBe(true);
  });

  it('com qualquer ativo sem cotação não é', () => {
    expect(percentualDaCarteiraConfiavel(PARCIAL, 1)).toBe(false);
  });

  it('sem custo em aberto (tudo vendido) o percentual é uma divisão por zero do backend', () => {
    const tudoVendido: Rentabilidade = { ...COMPLETA, custo_base_brl: '0', valor_mercado_brl: '0', percentual: '0' };
    expect(percentualDaCarteiraConfiavel(tudoVendido, 0)).toBe(false);
  });

  it('valor de mercado zero com custo positivo (nada cotado) não é confiável', () => {
    const nadaCotado: Rentabilidade = { ...COMPLETA, valor_mercado_brl: '0', percentual: '-1' };
    expect(percentualDaCarteiraConfiavel(nadaCotado, 0)).toBe(false);
  });
});
