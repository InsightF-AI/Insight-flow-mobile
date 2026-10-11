import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const CHAVE_TEMA = 'insightflow.tema';
const CHAVE_PUSH = 'insightflow.push';

export type EsquemaTema = 'escuro' | 'claro';

const TEMA_PADRAO: EsquemaTema = 'escuro';

interface EstadoPreferencias {
  tema: EsquemaTema;
  /** Vontade do usuário de receber push neste aparelho (o que o aparelho consegue fazer é `usePush`). */
  pushLigado: boolean;
  hidratado: boolean;
  hidratar: () => Promise<void>;
  definirTema: (tema: EsquemaTema) => Promise<void>;
  definirPushLigado: (ligado: boolean) => Promise<void>;
}

export const usePreferencias = create<EstadoPreferencias>((set) => ({
  tema: TEMA_PADRAO,
  pushLigado: true,
  hidratado: false,

  hidratar: async () => {
    try {
      const [tema, push] = await Promise.all([SecureStore.getItemAsync(CHAVE_TEMA), SecureStore.getItemAsync(CHAVE_PUSH)]);
      set({ tema: tema === 'claro' ? 'claro' : TEMA_PADRAO, pushLigado: push !== '0', hidratado: true });
    } catch {
      // Sem leitura, o app abre no tema padrão em vez de travar na splash.
      set({ tema: TEMA_PADRAO, pushLigado: true, hidratado: true });
    }
  },

  definirPushLigado: async (ligado) => {
    set({ pushLigado: ligado });
    try {
      await SecureStore.setItemAsync(CHAVE_PUSH, ligado ? '1' : '0');
    } catch {
      // A escolha vale nesta sessão mesmo que não persista.
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
