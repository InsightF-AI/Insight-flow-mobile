import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { notificacoesApi } from '@/api/notificacoes';
import { criarClienteTempoReal } from '@/api/tempoReal';
import type { ItemWatchlist, Notificacao } from '@/api/tipos';
import { mesclarNotificacoes } from '@/dominio/notificacoes';
import { chaves } from '@/hooks/chaves';
import { useBanner } from '@/store/banner';
import { useSessao } from '@/store/sessao';
import { useConexaoTempoReal } from '@/store/tempoReal';

function guardar(queryClient: QueryClient, novas: Notificacao[]) {
  queryClient.setQueryData<Notificacao[]>(chaves.notificacoes, (atual) => mesclarNotificacoes(atual, novas));
}

/**
 * O servidor não reenvia o que chegou com a conexão caída: depois de cada conexão autenticada e ao voltar ao primeiro
 * plano, busca as não lidas e mescla por `id`. Sem lista carregada ainda, só pede a lista completa.
 */
export async function sincronizarNaoLidas(queryClient: QueryClient): Promise<void> {
  if (queryClient.getQueryData(chaves.notificacoes) === undefined) {
    await queryClient.invalidateQueries({ queryKey: chaves.notificacoes });
    return;
  }
  try {
    guardar(queryClient, await notificacoesApi.listar(true));
  } catch {
    // Sem rede agora: o polling de reserva e a próxima conexão cobrem.
  }
}

/** Notificação que chegou pelo WebSocket: entra na caixa, invalida o que ela afeta e (se for nova) vira banner. */
export function receberNotificacao(queryClient: QueryClient, notificacao: Notificacao): void {
  const jaExistia =
    queryClient.getQueryData<Notificacao[]>(chaves.notificacoes)?.some((n) => n.id === notificacao.id) ?? false;
  guardar(queryClient, [notificacao]);

  if (notificacao.tipo === 'ALERTA_DISPARADO') void queryClient.invalidateQueries({ queryKey: chaves.alertas });
  if (notificacao.tipo === 'SINAL_ATIVADO' && notificacao.ativo_id) {
    void queryClient.invalidateQueries({ queryKey: chaves.sinais(notificacao.ativo_id) });
  }

  // Já tinha chegado (pelo REST ou antes pelo WebSocket): o usuário já foi avisado.
  if (jaExistia || notificacao.lida) return;
  const itens = queryClient.getQueryData<ItemWatchlist[]>(chaves.watchlist);
  const ticker = itens?.find((item) => item.ativo.id === notificacao.ativo_id)?.ativo.ticker ?? null;
  useBanner.getState().mostrar(notificacao, ticker);
}

/** Mantém o WebSocket de notificações aberto enquanto o app está em primeiro plano. `url` null = sem tempo real. */
export function useTempoReal(url: string | null): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!url) return;
    const definirEstado = useConexaoTempoReal.getState().definir;
    const cliente = criarClienteTempoReal({
      url,
      obterToken: () => useSessao.getState().token,
      obterExpiracao: () => useSessao.getState().expiraEm,
      renovarToken: () => useSessao.getState().renovar(),
      aoNotificacao: (notificacao) => receberNotificacao(queryClient, notificacao),
      aoAutenticar: () => void sincronizarNaoLidas(queryClient),
      aoMudarEstado: definirEstado,
    });

    if (AppState.currentState === 'active') cliente.conectar();
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'background') {
        cliente.desconectar();
      } else if (estado === 'active') {
        // Conexão nova sincroniza ao autenticar; se já estava ativa, sincroniza agora.
        if (!cliente.conectar()) void sincronizarNaoLidas(queryClient);
      }
    });

    return () => {
      assinatura.remove();
      cliente.desconectar();
      definirEstado('desconectado');
    };
  }, [url, queryClient]);
}
