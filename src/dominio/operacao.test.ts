import { ApiError } from '@/api/client';
import { type FormOperacao, mensagemErroOperacao, validarOperacao } from '@/dominio/operacao';

const hoje = new Date(2026, 8, 25, 23, 30);
const base: FormOperacao = {
  tipo: 'COMPRA',
  ticker: ' petr4 ',
  quantidade: '10,5',
  precoUnitario: '38.20',
  data: new Date(2026, 8, 25, 10, 0),
};

describe('validarOperacao', () => {
  it('normaliza ticker, decimais e data', () => {
    expect(validarOperacao(base, hoje)).toEqual({
      ok: true,
      dados: { ticker: 'PETR4', tipo: 'COMPRA', quantidade: '10.5', precoUnitario: '38.20', data: '2026-09-25' },
    });
  });

  it('operação de hoje às 23:30 não é considerada futura (dia local, não UTC)', () => {
    const resultado = validarOperacao({ ...base, data: new Date(2026, 8, 25, 23, 30) }, hoje);
    expect(resultado.ok).toBe(true);
    // Em America/Sao_Paulo, 23:30 local já é o dia seguinte em UTC: grava o dia local, não o de toISOString().
    expect(resultado.ok && resultado.dados.data).toBe('2026-09-25');
  });

  it('data de amanhã é rejeitada', () => {
    expect(validarOperacao({ ...base, data: new Date(2026, 8, 26, 0, 5) }, hoje)).toEqual({
      ok: false,
      erros: { data: 'A data não pode ser futura' },
    });
  });

  it('exige ticker, quantidade e preço positivos', () => {
    expect(validarOperacao({ ...base, ticker: '  ', quantidade: '0', precoUnitario: 'abc' }, hoje)).toEqual({
      ok: false,
      erros: {
        ticker: 'Informe o ticker do ativo',
        quantidade: 'Informe uma quantidade maior que zero',
        precoUnitario: 'Informe um preço maior que zero',
      },
    });
  });
});

describe('mensagemErroOperacao', () => {
  const uuid = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  it('422 com só o UUID ao registrar vira quantidade insuficiente', () => {
    expect(mensagemErroOperacao(new ApiError(422, uuid), 'registrar')).toBe(
      'Quantidade insuficiente em carteira: a venda deixaria o saldo negativo na data informada ou em uma venda posterior.',
    );
  });

  it('422 com só o UUID ao remover explica o bloqueio', () => {
    expect(mensagemErroOperacao(new ApiError(422, uuid), 'remover')).toBe(
      'Esta operação não pode ser removida: uma venda posterior ficaria sem saldo em carteira.',
    );
  });

  it('422 com texto legível é mantido', () => {
    expect(mensagemErroOperacao(new ApiError(422, 'Mensagem sem tradução do backend'), 'registrar')).toBe(
      'Mensagem sem tradução do backend',
    );
  });

  it('outros erros usam a mensagem padrão', () => {
    expect(mensagemErroOperacao(new ApiError(0, 'Sem conexão com o servidor'), 'registrar')).toBe(
      'Sem conexão com o servidor',
    );
  });
});
