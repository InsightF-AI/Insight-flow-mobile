import { ApiError } from '@/api/client';
import { ehStatus, mensagemDeErro } from '@/utils/erros';

describe('mensagemDeErro', () => {
  it('usa a mensagem do ApiError', () => {
    expect(mensagemDeErro(new ApiError(0, 'Sem conexão com o servidor'))).toBe('Sem conexão com o servidor');
  });

  it('503 vira mensagem sobre a fonte de dados', () => {
    expect(mensagemDeErro(new ApiError(503, 'Fonte de dados de mercado indisponivel'))).toBe(
      'Fonte de dados de mercado indisponível. Tente novamente em instantes.',
    );
  });

  it('erro desconhecido vira mensagem genérica', () => {
    expect(mensagemDeErro(new Error('boom'))).toBe('Algo deu errado. Tente novamente.');
  });
});

describe('ehStatus', () => {
  it('reconhece o status de um ApiError', () => {
    expect(ehStatus(new ApiError(404, 'x'), 404)).toBe(true);
    expect(ehStatus(new ApiError(409, 'x'), 404)).toBe(false);
  });

  it('é falso para outros erros e para null', () => {
    expect(ehStatus(new Error('x'), 404)).toBe(false);
    expect(ehStatus(null, 404)).toBe(false);
  });
});
