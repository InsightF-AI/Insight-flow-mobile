import { AVISO_IA } from '@/dominio/regulatorio';
import {
  avisoLegalDe,
  descreverProcedencia,
  MAXIMO_DE_CARACTERES,
  MAXIMO_DE_MENSAGENS,
  type MensagemLocal,
  montarMensagensDaApi,
  SUGESTOES_DO_CHAT,
  textoParaCopiar,
  validarPergunta,
} from '@/dominio/ia';
import { formatarDataHora } from '@/utils/formatacao';

function mensagem(papel: 'usuario' | 'assistente', texto: string, extra: Partial<MensagemLocal> = {}): MensagemLocal {
  return { id: `${papel}-${texto.slice(0, 12)}`, papel, texto, ...extra };
}

describe('avisoLegalDe', () => {
  it('usa o aviso que veio da API', () => {
    expect(avisoLegalDe('Aviso do servidor.')).toBe('Aviso do servidor.');
  });

  it.each([[''], ['   '], [null], [undefined]])('cai no texto fixo com %p', (vazio) => {
    expect(avisoLegalDe(vazio)).toBe(AVISO_IA);
  });
});

describe('descreverProcedencia', () => {
  const geradoEm = '2026-10-11T15:30:00Z';
  const quando = formatarDataHora(geradoEm);

  it('análise nova', () => {
    expect(descreverProcedencia({ gerado_em: geradoEm, em_cache: false, desatualizada: false })).toBe(
      `Gerada em ${quando}.`,
    );
  });

  it('análise reaproveitada porque os dados não mudaram', () => {
    expect(descreverProcedencia({ gerado_em: geradoEm, em_cache: true, desatualizada: false })).toBe(
      `Reaproveitada de ${quando}: os dados do ativo não mudaram desde então.`,
    );
  });

  it('desatualizada tem prioridade sobre o cache', () => {
    expect(descreverProcedencia({ gerado_em: geradoEm, em_cache: true, desatualizada: true })).toBe(
      `Análise de ${quando}. Pode estar desatualizada: o provedor de IA não respondeu agora.`,
    );
  });
});

describe('validarPergunta', () => {
  it.each([[''], ['   '], ['\n\t']])('recusa %p', (vazia) => {
    expect(validarPergunta(vazia)).toEqual({ valida: false, motivo: 'Escreva uma pergunta.' });
  });

  it('tira os espaços das pontas', () => {
    expect(validarPergunta('  Qual foi o resultado?  ')).toEqual({ valida: true, texto: 'Qual foi o resultado?' });
  });

  it('aceita exatamente o limite e recusa um caractere a mais', () => {
    expect(validarPergunta('a'.repeat(MAXIMO_DE_CARACTERES)).valida).toBe(true);
    expect(validarPergunta('a'.repeat(MAXIMO_DE_CARACTERES + 1))).toEqual({
      valida: false,
      motivo: 'A pergunta tem 2001 caracteres; o limite é 2000.',
    });
  });
});

describe('montarMensagensDaApi', () => {
  it('mantém a ordem e só leva papel e texto', () => {
    const resultado = montarMensagensDaApi([
      mensagem('usuario', 'Oi'),
      mensagem('assistente', 'Olá', { modelo: 'gemini', avisoLegal: 'x' }),
      mensagem('usuario', 'Qual o resultado?'),
    ]);
    expect(resultado).toEqual([
      { papel: 'usuario', texto: 'Oi' },
      { papel: 'assistente', texto: 'Olá' },
      { papel: 'usuario', texto: 'Qual o resultado?' },
    ]);
  });

  it('não leva a pergunta que falhou nem textos em branco', () => {
    const resultado = montarMensagensDaApi([
      mensagem('usuario', 'Pergunta sem resposta', { falhou: true }),
      mensagem('assistente', '   '),
      mensagem('usuario', 'Nova pergunta'),
    ]);
    expect(resultado).toEqual([{ papel: 'usuario', texto: 'Nova pergunta' }]);
  });

  it('leva só as últimas 20 mensagens', () => {
    const muitas = Array.from({ length: 31 }, (_, i) =>
      mensagem(i % 2 === 0 ? 'usuario' : 'assistente', `mensagem ${String(i).padStart(2, '0')}`),
    );
    const resultado = montarMensagensDaApi(muitas);
    expect(resultado.length).toBeLessThanOrEqual(MAXIMO_DE_MENSAGENS);
    expect(resultado[resultado.length - 1]).toEqual({ papel: 'usuario', texto: 'mensagem 30' });
  });

  it('a janela nunca começa por uma resposta da IA', () => {
    // 21 mensagens alternadas (usuario, assistente, ..., usuario): os últimos 20 começam pela resposta de índice 1.
    const alternadas = Array.from({ length: 21 }, (_, i) =>
      mensagem(i % 2 === 0 ? 'usuario' : 'assistente', `mensagem ${String(i).padStart(2, '0')}`),
    );
    const resultado = montarMensagensDaApi(alternadas);
    expect(resultado).toHaveLength(19);
    expect(resultado[0].papel).toBe('usuario');
    expect(resultado[resultado.length - 1].papel).toBe('usuario');
  });

  it('corta a resposta da IA que passa de 2000 caracteres (o backend recusaria o histórico)', () => {
    const longa = 'r'.repeat(MAXIMO_DE_CARACTERES + 500);
    const resultado = montarMensagensDaApi([
      mensagem('usuario', 'Explique a carteira'),
      mensagem('assistente', longa),
      mensagem('usuario', 'E o setor?'),
    ]);
    expect(resultado[1].texto).toHaveLength(MAXIMO_DE_CARACTERES);
  });

  it('não deixa meio emoji no fim do texto cortado', () => {
    const texto = `${'a'.repeat(MAXIMO_DE_CARACTERES - 1)}😀 fim`;
    const resultado = montarMensagensDaApi([mensagem('usuario', 'Oi'), mensagem('assistente', texto), mensagem('usuario', 'E?')]);
    const cortado = resultado[1].texto;
    expect(cortado).toHaveLength(MAXIMO_DE_CARACTERES - 1);
    expect(/[\ud800-\udbff]$/.test(cortado)).toBe(false);
  });
});

describe('textoParaCopiar', () => {
  it('leva o aviso legal junto da resposta', () => {
    expect(textoParaCopiar({ texto: 'A carteira rendeu 2%.', avisoLegal: 'Aviso do servidor.' })).toBe(
      'A carteira rendeu 2%.\n\nAviso do servidor.',
    );
  });

  it('sem aviso guardado usa o texto fixo', () => {
    expect(textoParaCopiar({ texto: 'Resposta.' })).toBe(`Resposta.\n\n${AVISO_IA}`);
  });
});

describe('SUGESTOES_DO_CHAT', () => {
  it('são as seis do cliente web, todas dentro do limite e sem linguagem de recomendação', () => {
    expect(SUGESTOES_DO_CHAT).toHaveLength(6);
    for (const sugestao of SUGESTOES_DO_CHAT) {
      expect(validarPergunta(sugestao).valida).toBe(true);
      expect(sugestao).not.toMatch(/\b(compre|comprar|venda|vender|invista|investir)\b/i);
    }
  });
});
