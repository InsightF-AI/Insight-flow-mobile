import { create } from 'zustand';

import { dispositivosApi } from '@/api/dispositivos';
import type { MotivoDeIndisponibilidade, SituacaoDoPush } from '@/dominio/push';
import { configurarExibicaoEmPrimeiroPlano, lerSuporte, prepararPush } from '@/notificacoes/push';
import { usePreferencias } from '@/store/preferencias';
import { geracaoDaSessao, useSessao } from '@/store/sessao';

interface EstadoPush {
  situacao: SituacaoDoPush;
  motivo: MotivoDeIndisponibilidade | null;
  /** Token Expo registrado nesta sessão; necessário para remover o aparelho. */
  token: string | null;
  /** Erro do último registro (`situacao: 'erro'`). */
  erro: unknown;
  /** `pedirPermissao: true` só quando o usuário acabou de ligar o push no Perfil. */
  sincronizar: (opcoes?: { pedirPermissao?: boolean }) => Promise<void>;
  ligar: () => Promise<void>;
  desligar: () => Promise<void>;
  /** Remove o aparelho do backend sem mexer na preferência (usado antes do logout). Nunca rejeita. */
  desregistrar: () => Promise<void>;
  reiniciar: () => void;
}

const INICIAL = { situacao: 'verificando', motivo: null, token: null, erro: null } as const;

// Uma execução por sessão: a de uma sessão anterior que ainda não terminou não pode ocupar a vez da seguinte.
let emAndamento: { geracao: number; promessa: Promise<void> } | null = null;

export const usePush = create<EstadoPush>()((set, get) => ({
  ...INICIAL,

  sincronizar: (opcoes = {}) => {
    const geracao = geracaoDaSessao();
    if (emAndamento?.geracao === geracao) return emAndamento.promessa;

    const promessa = (async () => {
      const suporte = lerSuporte();
      if (!suporte.suportado) {
        set({ situacao: 'indisponivel', motivo: suporte.motivo, token: null, erro: null });
        return;
      }
      if (!usePreferencias.getState().pushLigado) {
        set({ situacao: 'desligado', motivo: null, token: null, erro: null });
        return;
      }
      set({ situacao: 'verificando', motivo: null, erro: null });
      try {
        await configurarExibicaoEmPrimeiroPlano();
        const preparo = await prepararPush(suporte.projectId, { pedirPermissao: opcoes.pedirPermissao ?? false });
        if (geracaoDaSessao() !== geracao) return;
        if (preparo.estado === 'negado') {
          set({ situacao: 'negado', token: null });
          return;
        }
        await dispositivosApi.registrar(preparo.token);
        if (geracaoDaSessao() !== geracao) return;
        set({ situacao: 'ligado', token: preparo.token, erro: null });
      } catch (erro) {
        if (geracaoDaSessao() !== geracao) return;
        set({ situacao: 'erro', erro });
      }
    })().finally(() => {
      if (emAndamento?.promessa === promessa) emAndamento = null;
    });

    emAndamento = { geracao, promessa };
    return promessa;
  },

  ligar: async () => {
    await usePreferencias.getState().definirPushLigado(true);
    // Uma sincronização automática em curso não pede permissão: espera terminar e refaz já com o pedido do usuário.
    const antiga = emAndamento;
    if (antiga) await antiga.promessa.catch(() => {});
    await get().sincronizar({ pedirPermissao: true });
  },

  desligar: async () => {
    await usePreferencias.getState().definirPushLigado(false);
    const { token } = get();
    set({ situacao: 'desligado', motivo: null, token: null, erro: null });
    if (token) await dispositivosApi.remover(token).catch(() => {});
  },

  desregistrar: async () => {
    const { token } = get();
    if (!token) return;
    set({ token: null });
    await dispositivosApi.remover(token).catch(() => {});
  },

  reiniciar: () => set({ ...INICIAL }),
}));

// Sessão encerrada (logout, refresh recusado): o estado do push era da conta que saiu.
useSessao.subscribe((estado, anterior) => {
  if (anterior.status === 'autenticado' && estado.status !== 'autenticado') usePush.getState().reiniciar();
});
