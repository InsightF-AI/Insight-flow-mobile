import { ApiError } from '@/api/client';
import { codigoDoErro, ehStatus, mensagemDeErro } from '@/utils/erros';

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

  it.each([
    ['Ativo ja esta na watchlist', 'Este ativo já está na sua watchlist'],
    ['Item nao encontrado na watchlist', 'Este ativo não está mais na sua watchlist'],
    ['Cotacao nao encontrada para o ativo', 'Cotação indisponível para este ativo'],
    ['Provedor de IA indisponivel', 'A IA está indisponível no momento. Tente novamente em instantes.'],
    [
      'Resposta da IA bloqueada pelo guardrail',
      'A IA não conseguiu gerar um texto dentro das regras de linguagem. Tente novamente.',
    ],
  ])('traduz "%s"', (doBackend, esperado) => {
    expect(mensagemDeErro(new ApiError(404, doBackend))).toBe(esperado);
  });

  it('503 sem mensagem conhecida vira serviço indisponível', () => {
    expect(mensagemDeErro(new ApiError(503, 'Erro 503'))).toBe(
      'Serviço indisponível no momento. Tente novamente em instantes.',
    );
  });

  it('500 genérico vira erro no servidor', () => {
    expect(mensagemDeErro(new ApiError(500, 'Erro 500'))).toBe('Erro no servidor. Tente novamente em instantes.');
  });

  it('mensagem que não está no dicionário passa como veio', () => {
    expect(mensagemDeErro(new ApiError(422, 'Mensagem sem tradução do backend'))).toBe('Mensagem sem tradução do backend');
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

describe('codigoDoErro', () => {
  it('devolve o requestId do ApiError', () => {
    expect(codigoDoErro(new ApiError(500, 'x', { requestId: 'srv-42' }))).toBe('srv-42');
  });

  it('é null sem requestId ou para outros erros', () => {
    expect(codigoDoErro(new ApiError(500, 'x'))).toBeNull();
    expect(codigoDoErro(new Error('x'))).toBeNull();
  });
});
