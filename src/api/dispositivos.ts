import { request } from '@/api/client';
import type { DispositivoResponse } from '@/api/tipos';

export const dispositivosApi = {
  /** `201` aparelho novo, `200` já existia (e, se era de outra conta, passa para a atual). */
  registrar: (token: string) => request<DispositivoResponse>('/dispositivos', { metodo: 'POST', corpo: { token } }),
  /** Idempotente (`204`). O token tem colchetes: o client o codifica na query. */
  remover: (token: string) => request<void>('/dispositivos', { metodo: 'DELETE', query: { token } }),
};
