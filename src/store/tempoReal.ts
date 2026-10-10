import { create } from 'zustand';

import type { EstadoTempoReal } from '@/api/tempoReal';

interface EstadoDaConexao {
  estado: EstadoTempoReal;
  definir: (estado: EstadoTempoReal) => void;
}

/** Estado do WebSocket de notificações: o polling de reserva só roda enquanto não estiver `conectado`. */
export const useConexaoTempoReal = create<EstadoDaConexao>()((set) => ({
  estado: 'desconectado',
  definir: (estado) => set({ estado }),
}));
