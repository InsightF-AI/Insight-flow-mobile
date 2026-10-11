import { create } from 'zustand';

import { ApiError } from '@/api/client';
import { dispositivosApi } from '@/api/dispositivos';
import type { MotivoDeIndisponibilidade, SituacaoDoPush } from '@/dominio/push';
import { configurarExibicaoEmPrimeiroPlano, lerSuporte, prepararPush } from '@/notificacoes/push';
import { usePreferencias } from '@/store/preferencias';
import { geracaoDaSessao, useSessao } from '@/store/sessao';

/**
 * O token do Expo e o `POST` dependem de rede e, no Android, de um cliente HTTP sem tempo limite: sem este limite um
 * registro parado deixaria o Perfil em "Verificando", com o interruptor travado, até fechar o app.
 */
export const LIMITE_DO_REGISTRO_MS = 30_000;

interface EstadoPush {
  situacao: SituacaoDoPush;
  motivo: MotivoDeIndisponibilidade | null;
  /**
   * Token Expo deste aparelho, guardado assim que é obtido (antes do `POST`): se a resposta não chegar o servidor pode
   * já ter gravado o aparelho, e é este token que sai no `DELETE` (idempotente).
   */
  token: string | null;
  /** Erro do último registro (`situacao: 'erro'`). */
  erro: unknown;
  /** `pedirPermissao: true` só quando o usuário acabou de ligar o push no Perfil. */
  sincronizar: (opcoes?: { pedirPermissao?: boolean }) => Promise<void>;
  ligar: () => Promise<void>;
  /**
   * Remove o aparelho do backend e só então grava a escolha de desligar. Rejeita se o servidor não confirmar: assim a
   * tela não diz "desligadas" enquanto os avisos continuam chegando.
   */
  desligar: () => Promise<void>;
  /** Remove o aparelho do backend sem mexer na preferência (usado antes do logout). Nunca rejeita. */
  desregistrar: () => Promise<void>;
  reiniciar: () => void;
}

const INICIAL = { situacao: 'verificando', motivo: null, token: null, erro: null } as const;

// Uma execução por sessão: a de uma sessão anterior que ainda não terminou não pode ocupar a vez da seguinte.
let emAndamento: { geracao: number; promessa: Promise<void> } | null = null;

/** O registro em curso decide se o aparelho existe no servidor: remover antes dele terminar deixaria o `POST` valer. */
async function aguardarRegistroEmCurso(): Promise<void> {
  if (emAndamento) await emAndamento.promessa.catch(() => {});
}

export const usePush = create<EstadoPush>()((set, get) => ({
  ...INICIAL,

  sincronizar: (opcoes = {}) => {
    const geracao = geracaoDaSessao();
    if (emAndamento?.geracao === geracao) return emAndamento.promessa;

    // Depois do limite, o que a execução parada ainda produzir (token, `POST`) é descartado.
    const execucao = { expirou: false };
    const obsoleta = () => execucao.expirou || geracaoDaSessao() !== geracao;

    async function registrar(): Promise<void> {
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
      await configurarExibicaoEmPrimeiroPlano();
      const preparo = await prepararPush(suporte.projectId, { pedirPermissao: opcoes.pedirPermissao ?? false });
      if (obsoleta()) return;
      if (preparo.estado === 'negado') {
        set({ situacao: 'negado', token: null });
        return;
      }
      set({ token: preparo.token });
      await dispositivosApi.registrar(preparo.token);
      if (obsoleta()) return;
      set({ situacao: 'ligado', erro: null });
    }

    const promessa = (async () => {
      let temporizador: ReturnType<typeof setTimeout> | undefined;
      const limite = new Promise<never>((_resolver, rejeitar) => {
        temporizador = setTimeout(() => {
          execucao.expirou = true;
          rejeitar(new ApiError(0, 'O registro demorou demais. Confira a conexão e tente novamente.', { causa: 'tempo' }));
        }, LIMITE_DO_REGISTRO_MS);
      });
      try {
        await Promise.race([registrar(), limite]);
      } catch (erro) {
        if (geracaoDaSessao() === geracao) set({ situacao: 'erro', erro });
      } finally {
        clearTimeout(temporizador);
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
    await aguardarRegistroEmCurso();
    await get().sincronizar({ pedirPermissao: true });
  },

  desligar: async () => {
    await aguardarRegistroEmCurso();
    const { token } = get();
    if (token) await dispositivosApi.remover(token);
    await usePreferencias.getState().definirPushLigado(false);
    set({ situacao: 'desligado', motivo: null, token: null, erro: null });
  },

  desregistrar: async () => {
    await aguardarRegistroEmCurso();
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
