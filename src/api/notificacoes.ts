import { request } from '@/api/client';
import type { Notificacao, Uuid } from '@/api/tipos';

export const notificacoesApi = {
  listar: (apenasNaoLidas = false) =>
    request<Notificacao[]>('/notificacoes', {
      query: apenasNaoLidas ? { apenas_nao_lidas: true } : undefined,
    }),
  marcarComoLida: (notificacaoId: Uuid) =>
    request<Notificacao>(`/notificacoes/${notificacaoId}/lida`, { metodo: 'PATCH' }),
};
