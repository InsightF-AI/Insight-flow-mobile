import type { Notificacao, Uuid } from '@/api/tipos';
import { ROTULO_TIPO_NOTIFICACAO } from '@/dominio/rotulos';

/**
 * Une listas de notificações por `id`, mais recentes primeiro. `lida` nunca volta a falso: uma leitura feita aqui e ainda
 * não confirmada pelo servidor vence um `GET` anterior a ela.
 */
export function mesclarNotificacoes(
  atual: readonly Notificacao[] | undefined,
  novas: readonly Notificacao[],
): Notificacao[] {
  const porId = new Map<Uuid, Notificacao>();
  for (const notificacao of atual ?? []) porId.set(notificacao.id, notificacao);
  for (const notificacao of novas) {
    const anterior = porId.get(notificacao.id);
    porId.set(notificacao.id, anterior ? { ...notificacao, lida: notificacao.lida || anterior.lida } : notificacao);
  }
  return [...porId.values()].sort((a, b) => Date.parse(b.criado_em) - Date.parse(a.criado_em));
}

export function contarNaoLidas(notificacoes: readonly Notificacao[] | undefined): number {
  return (notificacoes ?? []).filter((notificacao) => !notificacao.lida).length;
}

export interface DestinoDaNotificacao {
  pathname: '/ativo/[id]' | '/notificacao/[id]';
  params: { id: Uuid; ticker?: string };
}

/** Notificação de um ativo abre o ativo; as demais (resumo diário) abrem o detalhe da própria notificação. */
export function destinoDaNotificacao(notificacao: Notificacao, ticker?: string | null): DestinoDaNotificacao {
  if (notificacao.ativo_id) {
    return {
      pathname: '/ativo/[id]',
      params: ticker ? { id: notificacao.ativo_id, ticker } : { id: notificacao.ativo_id },
    };
  }
  return { pathname: '/notificacao/[id]', params: { id: notificacao.id } };
}

export function tituloDaNotificacao(notificacao: Notificacao, ticker?: string | null): string {
  const tipo = ROTULO_TIPO_NOTIFICACAO[notificacao.tipo];
  return ticker ? `${tipo} · ${ticker}` : tipo;
}
