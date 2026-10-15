import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { ItemWatchlist } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { chaves } from '@/hooks/chaves';
import { useDefinirNotificacao } from '@/hooks/useWatchlist';
import { criarProvedor, criarQueryClientDeTeste } from '@/test/renderizar';

jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn(), definirNotificacao: jest.fn() } }));

function item(id: string, ticker: string, notificar: boolean): ItemWatchlist {
  return {
    ativo: { id, ticker, nome: ticker, tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar,
    adicionado_em: '2026-10-01T12:00:00Z',
  };
}

function prepararCache() {
  const queryClient = criarQueryClientDeTeste();
  queryClient.setQueryData(chaves.watchlist, [item('a-1', 'PETR4', true), item('a-2', 'VALE3', true)]);
  return queryClient;
}

function notificarDe(queryClient: ReturnType<typeof criarQueryClientDeTeste>, indice: number) {
  return queryClient.getQueryData<ItemWatchlist[]>(chaves.watchlist)?.[indice].notificar;
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('muda a watchlist em cache na hora, antes da resposta do servidor, só no ativo alterado', async () => {
  const queryClient = prepararCache();
  let responder: (valor: ItemWatchlist) => void = () => {};
  jest.mocked(watchlistApi.definirNotificacao).mockReturnValue(
    new Promise<ItemWatchlist>((resolver) => {
      responder = resolver;
    }),
  );
  const { result } = await renderHook(() => useDefinirNotificacao(), { wrapper: criarProvedor(queryClient) });
  await act(async () => {
    result.current.mutate({ ativoId: 'a-1', notificar: false });
  });
  await waitFor(() => expect(notificarDe(queryClient, 0)).toBe(false));
  expect(notificarDe(queryClient, 1)).toBe(true);
  await act(async () => {
    responder(item('a-1', 'PETR4', false));
  });
});

it('desfaz a alteração quando o servidor recusa', async () => {
  const queryClient = prepararCache();
  jest.mocked(watchlistApi.definirNotificacao).mockRejectedValue(new Error('falhou'));
  const { result } = await renderHook(() => useDefinirNotificacao(), { wrapper: criarProvedor(queryClient) });
  await act(async () => {
    result.current.mutate({ ativoId: 'a-1', notificar: false });
  });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(notificarDe(queryClient, 0)).toBe(true);
});

it('termina com a resposta do PATCH, sem esperar a releitura da lista', async () => {
  const queryClient = prepararCache();
  const invalidar = jest.spyOn(queryClient, 'invalidateQueries').mockReturnValue(new Promise<void>(() => {}));
  jest.mocked(watchlistApi.definirNotificacao).mockResolvedValue(item('a-1', 'PETR4', false));
  const { result } = await renderHook(() => useDefinirNotificacao(), { wrapper: criarProvedor(queryClient) });
  await act(async () => {
    result.current.mutate({ ativoId: 'a-1', notificar: false });
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(invalidar).toHaveBeenCalledWith({ queryKey: chaves.watchlist });
});
