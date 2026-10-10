import { create } from 'zustand';

import type { Notificacao } from '@/api/tipos';

export interface BannerAtual {
  /** Muda a cada banner: reinicia o tempo de exibição mesmo quando a notificação é parecida. */
  chave: number;
  notificacao: Notificacao;
  ticker: string | null;
}

interface EstadoBanner {
  atual: BannerAtual | null;
  mostrar: (notificacao: Notificacao, ticker: string | null) => void;
  dispensar: () => void;
}

let contador = 0;

export const useBanner = create<EstadoBanner>()((set) => ({
  atual: null,
  mostrar: (notificacao, ticker) => {
    contador += 1;
    set({ atual: { chave: contador, notificacao, ticker } });
  },
  dispensar: () => set({ atual: null }),
}));
