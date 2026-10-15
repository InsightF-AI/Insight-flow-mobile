import { ApiError } from '@/api/client';
import { mensagemDeErro, mensagemDeErroDaIA } from '@/utils/erros';
import { formatarEspera } from '@/utils/formatacao';

describe('formatarEspera', () => {
  it.each([
    [1, '1 s'],
    [1.2, '2 s'],
    [30, '30 s'],
    [59, '59 s'],
    [60, 'cerca de 1 min'],
    [61, 'cerca de 2 min'],
    [120, 'cerca de 2 min'],
    [3541, 'cerca de 1 h'],
    [3599, 'cerca de 1 h'],
    [3600, 'cerca de 1 h'],
    [7300, 'cerca de 3 h'],
  ])('%d s vira "%s"', (segundos, esperado) => {
    expect(formatarEspera(segundos)).toBe(esperado);
  });

  it.each([[0], [-5], [Number.NaN], [Number.POSITIVE_INFINITY]])('%d vira "alguns instantes"', (segundos) => {
    expect(formatarEspera(segundos)).toBe('alguns instantes');
  });
});

describe('mensagens de erro da IA', () => {
  it('cota com Retry-After diz quanto esperar', () => {
    const erro = new ApiError(503, 'Cota do provedor de IA excedida', { retryAfterSegundos: 90 });
    expect(mensagemDeErro(erro)).toBe('O limite de uso da IA foi atingido. Tente novamente em cerca de 2 min.');
  });

  it('cota sem Retry-After pede para tentar mais tarde', () => {
    const erro = new ApiError(503, 'Cota do provedor de IA excedida');
    expect(mensagemDeErro(erro)).toBe('O limite de uso da IA foi atingido. Tente novamente mais tarde.');
  });

  it('provedor indisponível (inclui a IA desligada no servidor)', () => {
    expect(mensagemDeErro(new ApiError(503, 'Provedor de IA indisponivel'))).toBe(
      'A IA está indisponível no momento. Tente novamente em instantes.',
    );
  });

  it('tempo esgotado tem texto próprio na análise e no chat', () => {
    const erro = new ApiError(0, 'O servidor demorou demais para responder (http://api)', { causa: 'tempo' });
    expect(mensagemDeErroDaIA(erro, 'analise')).toBe(
      'A IA demorou mais que o esperado. A análise pode já estar pronta no servidor: tente novamente.',
    );
    expect(mensagemDeErroDaIA(erro, 'chat')).toBe(
      'A IA demorou mais que o esperado para responder. Tente enviar a pergunta de novo.',
    );
  });

  it('os demais erros seguem mensagemDeErro', () => {
    const rede = new ApiError(0, 'Sem conexão com o servidor (http://api)', { causa: 'rede' });
    expect(mensagemDeErroDaIA(rede, 'chat')).toBe(mensagemDeErro(rede));
    const guardrail = new ApiError(502, 'Resposta da IA bloqueada pelo guardrail');
    expect(mensagemDeErroDaIA(guardrail, 'analise')).toBe(
      'A IA não conseguiu gerar um texto dentro das regras de linguagem. Tente novamente.',
    );
  });
});
