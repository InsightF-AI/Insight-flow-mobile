import { ApiError } from '@/api/client';
import { formatarEspera } from '@/utils/formatacao';

/** Mensagens do backend (muitas sem acento) reescritas para a interface. As que não estão aqui passam como vieram. */
const MENSAGENS: Record<string, string> = {
  'Ativo nao encontrado': 'Ativo não encontrado',
  'Ativo ja esta na watchlist': 'Este ativo já está na sua watchlist',
  'Item nao encontrado na watchlist': 'Este ativo não está mais na sua watchlist',
  'Cotacao nao encontrada para o ativo': 'Cotação indisponível para este ativo',
  'Historico nao encontrado para o ativo': 'Histórico indisponível para este ativo',
  'Alerta nao encontrado': 'Alerta não encontrado',
  'Operacao nao encontrada': 'Operação não encontrada',
  'Notificacao nao encontrada': 'Notificação não encontrada',
  'Nenhuma operacao registrada': 'Nenhuma operação registrada',
  'data nao pode ser futura': 'A data da operação não pode ser futura',
  'Regra nao encontrada': 'Regra de sinal não encontrada',
  'Fonte de dados de mercado indisponivel': 'Fonte de dados de mercado indisponível. Tente novamente em instantes.',
  'Provedor de IA indisponivel': 'A IA está indisponível no momento. Tente novamente em instantes.',
  'Resposta da IA bloqueada pelo guardrail':
    'A IA não conseguiu gerar um texto dentro das regras de linguagem. Tente novamente.',
  'Dados insuficientes para gerar a analise': 'Ainda não há dados suficientes para analisar este ativo',
  'Senha atual incorreta': 'A senha atual está incorreta',
  'Token de redefinicao invalido': 'O código de redefinição é inválido ou expirou. Peça um novo e-mail.',
  'Fonte de dados de proventos indisponivel': 'Fonte de proventos indisponível. Tente novamente em instantes.',
  'Token de push invalido': 'Não foi possível registrar este aparelho para notificações',
};

const COTA_DA_IA = 'Cota do provedor de IA excedida';

function mensagemDaCota(erro: ApiError): string {
  const quando = erro.retryAfterSegundos === undefined ? 'mais tarde' : `em ${formatarEspera(erro.retryAfterSegundos)}`;
  return `O limite de uso da IA foi atingido. Tente novamente ${quando}.`;
}

export function ehStatus(erro: unknown, status: number): boolean {
  return erro instanceof ApiError && erro.status === status;
}

export function mensagemDeErro(erro: unknown): string {
  if (!(erro instanceof ApiError)) return 'Algo deu errado. Tente novamente.';
  if (erro.message === COTA_DA_IA) return mensagemDaCota(erro);
  const traduzida = MENSAGENS[erro.message];
  if (traduzida) return traduzida;
  if (erro.status === 503) return 'Serviço indisponível no momento. Tente novamente em instantes.';
  if (erro.status >= 500) return 'Erro no servidor. Tente novamente em instantes.';
  return erro.message;
}

/** Como `mensagemDeErro`, com texto próprio para o tempo esgotado (a IA é a chamada mais lenta do app). */
export function mensagemDeErroDaIA(erro: unknown, contexto: 'analise' | 'chat'): string {
  if (erro instanceof ApiError && erro.causa === 'tempo') {
    return contexto === 'analise'
      ? 'A IA demorou mais que o esperado. A análise pode já estar pronta no servidor: tente novamente.'
      : 'A IA demorou mais que o esperado para responder. Tente enviar a pergunta de novo.';
  }
  return mensagemDeErro(erro);
}

/** X-Request-ID da chamada que falhou: com ele a equipe do backend acha a requisição nos logs. */
export function codigoDoErro(erro: unknown): string | null {
  return erro instanceof ApiError && erro.requestId ? erro.requestId : null;
}
