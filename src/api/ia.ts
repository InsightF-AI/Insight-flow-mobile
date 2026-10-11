import { request } from '@/api/client';
import type { AnaliseIA, ChatRequest, ChatResponse, MensagemChatApi, Uuid } from '@/api/tipos';

// O servidor tenta o Gemini até 2 vezes (30 s cada) e o guardrail pode pedir uma segunda geração; o chat ainda pode
// encadear ferramentas. Se o app desistir antes, o servidor continua e a análise fica em cache.
export const TIMEOUT_ANALISE_MS = 70_000;
export const TIMEOUT_CHAT_MS = 90_000;

export const iaApi = {
  analisar: (ativoId: Uuid) => request<AnaliseIA>(`/ativos/${ativoId}/analise`, { timeoutMs: TIMEOUT_ANALISE_MS }),
  conversar: (mensagens: MensagemChatApi[]) => {
    const corpo: ChatRequest = { mensagens };
    return request<ChatResponse>('/chat', { metodo: 'POST', corpo, timeoutMs: TIMEOUT_CHAT_MS });
  },
};
