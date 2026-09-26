import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const CHAVE_TEMA = 'insightflow.tema';

export type EsquemaTema = 'escuro' | 'claro';

const TEMA_PADRAO: EsquemaTema = 'escuro';

interface EstadoPreferencias {
  tema: EsquemaTema;
  hidratado: boolean;
  hidratar: () => Promise<void>;
  definirTema: (tema: EsquemaTema) => Promise<void>;
}

export const usePreferencias = create<EstadoPreferencias>((set) => ({
  tema: TEMA_PADRAO,
  hidratado: false,

  hidratar: async () => {
    try {
      const salvo = await SecureStore.getItemAsync(CHAVE_TEMA);
      set({ tema: salvo === 'claro' ? 'claro' : TEMA_PADRAO, hidratado: true });
    } catch {
      // Sem leitura, o app abre no tema padrão em vez de travar na splash.
      set({ tema: TEMA_PADRAO, hidratado: true });
    }
  },

  definirTema: async (tema) => {
    set({ tema });
    try {
      await SecureStore.setItemAsync(CHAVE_TEMA, tema);
    } catch {
      // A escolha vale nesta sessão mesmo que não persista.
    }
  },
}));
