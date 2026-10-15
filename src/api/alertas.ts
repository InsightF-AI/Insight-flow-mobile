import { request } from '@/api/client';
import type { Alerta, AtualizarAlertaRequest, CriarAlertaRequest, Uuid } from '@/api/tipos';

export const alertasApi = {
  listar: () => request<Alerta[]>('/alertas'),
  criar: (dados: CriarAlertaRequest) => request<Alerta>('/alertas', { metodo: 'POST', corpo: dados }),
  atualizar: (alertaId: Uuid, dados: AtualizarAlertaRequest) =>
    request<Alerta>(`/alertas/${alertaId}`, { metodo: 'PATCH', corpo: dados }),
  remover: (alertaId: Uuid) => request<void>(`/alertas/${alertaId}`, { metodo: 'DELETE' }),
};
