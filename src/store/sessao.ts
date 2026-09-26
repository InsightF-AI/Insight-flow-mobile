import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { queryClient } from '@/hooks/queryClient';

const CHAVE_TOKEN = 'insightflow.token';
const CHAVE_EMAIL = 'insightflow.email';

export type StatusSessao = 'carregando' | 'autenticado' | 'anonimo';

interface EstadoSessao {
  status: StatusSessao;
  token: string | null;
  email: string | null;
  hidratar: () => Promise<void>;
  entrar: (token: string, email: string) => Promise<void>;
  sair: () => Promise<void>;
}

const ANONIMO = { status: 'anonimo', token: null, email: null } as const;

export const useSessao = create<EstadoSessao>()((set) => ({
  status: 'carregando',
  token: null,
  email: null,

  hidratar: async () => {
    try {
      const [token, email] = await Promise.all([
        SecureStore.getItemAsync(CHAVE_TOKEN),
        SecureStore.getItemAsync(CHAVE_EMAIL),
      ]);
      set(token ? { status: 'autenticado', token, email } : ANONIMO);
    } catch {
      set(ANONIMO);
    }
  },

  entrar: async (token, email) => {
    await SecureStore.setItemAsync(CHAVE_TOKEN, token);
    await SecureStore.setItemAsync(CHAVE_EMAIL, email);
    set({ status: 'autenticado', token, email });
  },

  // Idempotente: vários 401 em paralelo chamam `sair` ao mesmo tempo; apagar chave ausente é inofensivo.
  sair: async () => {
    set(ANONIMO);
    queryClient.clear();
    await Promise.all([SecureStore.deleteItemAsync(CHAVE_TOKEN), SecureStore.deleteItemAsync(CHAVE_EMAIL)]);
  },
}));
