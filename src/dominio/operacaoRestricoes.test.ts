import { validarOperacao } from '@/dominio/operacao';

const HOJE = new Date(2026, 9, 10, 12, 0, 0);
const BASE = { tipo: 'COMPRA' as const, ticker: 'PETR4', quantidade: '10', precoUnitario: '38,5', data: HOJE };

describe('validarOperacao com restrições', () => {
  it('sem restrições segue como antes', () => {
    expect(validarOperacao(BASE, HOJE).ok).toBe(true);
  });

  it('ticker fora da lista permitida é recusado, sem diferenciar maiúsculas', () => {
    const fora = validarOperacao({ ...BASE, ticker: 'vale3' }, HOJE, { tickersPermitidos: ['PETR4'] });
    expect(fora).toEqual({ ok: false, erros: { ticker: 'Escolha um ativo da lista' } });
    expect(validarOperacao({ ...BASE, ticker: ' petr4 ' }, HOJE, { tickersPermitidos: ['PETR4'] }).ok).toBe(true);
  });

  it('venda hoje maior que a quantidade disponível é recusada com a quantidade na mensagem', () => {
    const resultado = validarOperacao({ ...BASE, tipo: 'VENDA', quantidade: '11' }, HOJE, { disponivel: 10 });
    expect(resultado).toEqual({ ok: false, erros: { quantidade: 'Maior que a quantidade disponível (10)' } });
  });

  it('venda igual ao disponível passa', () => {
    expect(validarOperacao({ ...BASE, tipo: 'VENDA', quantidade: '10' }, HOJE, { disponivel: 10 }).ok).toBe(true);
  });

  it('venda sem posição diz isso', () => {
    const resultado = validarOperacao({ ...BASE, tipo: 'VENDA' }, HOJE, { disponivel: 0 });
    expect(resultado).toEqual({ ok: false, erros: { quantidade: 'Sem posição em carteira neste ativo' } });
  });

  it('venda com data passada vai para o servidor decidir (a posição na data pode ser outra)', () => {
    const ontem = new Date(2026, 9, 9, 12, 0, 0);
    expect(validarOperacao({ ...BASE, tipo: 'VENDA', quantidade: '50', data: ontem }, HOJE, { disponivel: 10 }).ok).toBe(true);
  });

  it('compra nunca é limitada pela quantidade disponível', () => {
    expect(validarOperacao({ ...BASE, quantidade: '500' }, HOJE, { disponivel: 10 }).ok).toBe(true);
  });

  it('disponível desconhecido (null) não bloqueia', () => {
    expect(validarOperacao({ ...BASE, tipo: 'VENDA', quantidade: '500' }, HOJE, { disponivel: null }).ok).toBe(true);
  });
});
