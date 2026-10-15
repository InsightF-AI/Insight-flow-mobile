import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { authApi } from '@/api/auth';
import { ApiError } from '@/api/client';
import type { TokenResponse } from '@/api/tipos';
import { queryClient } from '@/hooks/queryClient';

const CHAVE_SESSAO = 'insightflow.sessao';
/** Chaves do MVP antigo (token de 24 h, sem refresh): apagadas ao hidratar. */
const CHAVES_ANTIGAS = ['insightflow.token', 'insightflow.email'] as const;

/** Renova quando faltar menos que isto para o access token vencer (como o cliente desktop). */
export const MARGEM_RENOVACAO_MS = 60_000;

export type StatusSessao = 'carregando' | 'autenticado' | 'anonimo';

interface SessaoSalva {
  accessToken: string;
  refreshToken: string;
  /** Epoch em ms em que o access token vence. */
  expiraEm: number;
  email: string;
}

interface EstadoSessao {
  status: StatusSessao;
  token: string | null;
  refreshToken: string | null;
  expiraEm: number | null;
  email: string | null;
  hidratar: () => Promise<void>;
  entrar: (tokens: TokenResponse, email: string) => Promise<void>;
  /** Novo access token; null se a sessão acabou (refresh recusado). Rejeita sem rede. Uma renovação por vez. */
  renovar: () => Promise<string | null>;
  sair: (opcoes?: { revogarNoServidor?: boolean }) => Promise<void>;
}

const ANONIMO = { status: 'anonimo', token: null, refreshToken: null, expiraEm: null, email: null } as const;

export function pertoDeVencer(expiraEm: number | null, agora: number = Date.now()): boolean {
  return expiraEm !== null && expiraEm - agora < MARGEM_RENOVACAO_MS;
}

function paraSessao(tokens: TokenResponse, email: string): SessaoSalva {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiraEm: Date.now() + tokens.expires_in * 1000,
    email,
  };
}

function lerSessao(bruto: string | null): SessaoSalva | null {
  if (!bruto) return null;
  try {
    const dados = JSON.parse(bruto) as Partial<SessaoSalva> | null;
    if (
      typeof dados?.accessToken === 'string' &&
      typeof dados.refreshToken === 'string' &&
      typeof dados.expiraEm === 'number' &&
      typeof dados.email === 'string'
    ) {
      return dados as SessaoSalva;
    }
  } catch {
    // Conteúdo corrompido: trata como sessão ausente.
  }
  return null;
}

function autenticado(sessao: SessaoSalva) {
  return {
    status: 'autenticado' as const,
    token: sessao.accessToken,
    refreshToken: sessao.refreshToken,
    expiraEm: sessao.expiraEm,
    email: sessao.email,
  };
}

// Cada hidratação, login e logout inicia uma nova "geração" da sessão (renovar NÃO inicia). O client e a renovação a
// comparam para que respostas tardias de uma sessão anterior nunca toquem a atual.
let geracao = 0;

export function geracaoDaSessao(): number {
  return geracao;
}

// Duas renovações com o mesmo refresh token são tratadas pelo backend como roubo e revogam a sessão inteira.
// A renovação em andamento só é compartilhada dentro da mesma geração.
let renovacaoEmAndamento: { geracao: number; promessa: Promise<string | null> } | null = null;

export const useSessao = create<EstadoSessao>()((set, get) => ({
  ...ANONIMO,
  status: 'carregando',

  hidratar: async () => {
    try {
      const sessao = lerSessao(await SecureStore.getItemAsync(CHAVE_SESSAO));
      geracao += 1;
      set(sessao ? autenticado(sessao) : ANONIMO);
    } catch {
      set(ANONIMO);
    }
    await Promise.allSettled(CHAVES_ANTIGAS.map((chave) => SecureStore.deleteItemAsync(chave)));
  },

  // Uma única chave: a gravação é atômica e não deixa credencial parcial.
  entrar: async (tokens, email) => {
    const sessao = paraSessao(tokens, email);
    await SecureStore.setItemAsync(CHAVE_SESSAO, JSON.stringify(sessao));
    geracao += 1;
    set(autenticado(sessao));
  },

  renovar: () => {
    if (renovacaoEmAndamento?.geracao === geracao) return renovacaoEmAndamento.promessa;
    const minhaGeracao = geracao;

    const promessa: Promise<string | null> = (async () => {
      const { refreshToken, email } = get();
      if (!refreshToken || !email) return null;

      let tokens: TokenResponse;
      try {
        tokens = await authApi.renovar(refreshToken);
      } catch (erro) {
        if (erro instanceof ApiError && erro.status === 401) {
          // Refresh expirado, revogado ou já usado: não há o que revogar no servidor. Só encerra se a sessão ainda for a
          // que pediu a renovação: a resposta tardia de A não pode derrubar o B que entrou depois.
          if (geracao === minhaGeracao) {
            await get()
              .sair({ revogarNoServidor: false })
              .catch(() => {});
          }
          return null;
        }
        throw erro;
      }

      // Logout (ou outro login) durante a renovação: não ressuscita a sessão antiga.
      if (geracao !== minhaGeracao) return null;
      const sessao = paraSessao(tokens, email);
      set(autenticado(sessao));
      // Se gravar falhar, a sessão segue em memória; ao reabrir o app o refresh antigo será recusado e pedirá login.
      await SecureStore.setItemAsync(CHAVE_SESSAO, JSON.stringify(sessao)).catch(() => {});
      return sessao.accessToken;
    })().finally(() => {
      if (renovacaoEmAndamento?.promessa === promessa) renovacaoEmAndamento = null;
    });

    renovacaoEmAndamento = { geracao: minhaGeracao, promessa };
    return promessa;
  },

  // Idempotente: limpa o estado antes de qualquer espera, então só a primeira chamada vê o refresh token.
  sair: async ({ revogarNoServidor = true } = {}) => {
    const { refreshToken } = get();
    geracao += 1;
    set(ANONIMO);
    queryClient.clear();
    if (revogarNoServidor && refreshToken) void authApi.sair(refreshToken).catch(() => {});
    await SecureStore.deleteItemAsync(CHAVE_SESSAO);
  },
}));
