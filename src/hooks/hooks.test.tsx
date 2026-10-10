import { act, renderHook, waitFor } from '@testing-library/react-native';

import { alertasApi } from '@/api/alertas';
import { ativosApi } from '@/api/ativos';
import { notificacoesApi } from '@/api/notificacoes';
import { portfolioApi } from '@/api/portfolio';
import type { Alerta, CotacaoAtual, ItemWatchlist, Notificacao, Operacao } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { chaves } from '@/hooks/chaves';
import { useCriarAlerta } from '@/hooks/useAlertas';
import { useCotacao } from '@/hooks/useAtivo';
import { useBuscaAtivos, useDebounce } from '@/hooks/useBusca';
import { useMarcarLida, useNaoLidas } from '@/hooks/useNotificacoes';
import { useRegistrarOperacao, useRemoverOperacao } from '@/hooks/usePortfolio';
import { useResolverAtivo } from '@/hooks/useResolverAtivo';
import { useDefinirNotificacao, useRemoverWatchlist } from '@/hooks/useWatchlist';
import { criarProvedor, criarQueryClientDeTeste } from '@/test/renderizar';

// jest.mock é içado pelo babel-jest para antes dos imports.
jest.mock('@/api/portfolio', () => ({ portfolioApi: { registrarOperacao: jest.fn(), removerOperacao: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({
  watchlistApi: { listar: jest.fn(), adicionar: jest.fn(), remover: jest.fn(), definirNotificacao: jest.fn() },
}));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));
jest.mock('@/api/alertas', () => ({ alertasApi: { criar: jest.fn() } }));
jest.mock('@/api/ativos', () => ({ ativosApi: { buscar: jest.fn(), cotacao: jest.fn() } }));

function itemWatchlist(id: string, ticker: string): ItemWatchlist {
  return {
    ativo: { id, ticker, nome: ticker, tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-09-25T12:00:00Z',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('toda chave de portfólio fica sob ["portfolio"] (uma invalidação cobre todas)', () => {
  for (const chave of [chaves.posicoes, chaves.rentabilidade, chaves.distribuicao, chaves.benchmark('CDI')]) {
    expect(chave[0]).toBe(chaves.portfolio[0]);
  }
});

it('useDebounce só entrega o valor novo depois do atraso', async () => {
  jest.useFakeTimers();
  try {
    const { result, rerender } = await renderHook(({ valor }: { valor: string }) => useDebounce(valor, 400), {
      initialProps: { valor: 'PE' },
    });
    await rerender({ valor: 'PETR' });
    expect(result.current).toBe('PE');
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(result.current).toBe('PETR');
  } finally {
    jest.useRealTimers();
  }
});

it('registrar operação invalida operações e portfólio', async () => {
  const queryClient = criarQueryClientDeTeste();
  const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
  jest.mocked(portfolioApi.registrarOperacao).mockResolvedValue({ id: 'o-1' } as Operacao);
  const { result } = await renderHook(() => useRegistrarOperacao(), { wrapper: criarProvedor(queryClient) });

  await act(async () => {
    await result.current.mutateAsync({
      ativo_id: 'a-1',
      tipo: 'COMPRA',
      quantidade: '1',
      preco_unitario: '10',
      data: '2026-09-25',
    });
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(portfolioApi.registrarOperacao).toHaveBeenCalledWith({
    ativo_id: 'a-1',
    tipo: 'COMPRA',
    quantidade: '1',
    preco_unitario: '10',
    data: '2026-09-25',
  });
  expect(invalidar).toHaveBeenCalledWith({ queryKey: chaves.operacoes });
  expect(invalidar).toHaveBeenCalledWith({ queryKey: chaves.portfolio });
});

it('remover operação invalida operações e portfólio', async () => {
  const queryClient = criarQueryClientDeTeste();
  const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
  jest.mocked(portfolioApi.removerOperacao).mockResolvedValue(undefined);
  const { result } = await renderHook(() => useRemoverOperacao(), { wrapper: criarProvedor(queryClient) });

  await act(async () => {
    await result.current.mutateAsync('o-1');
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(portfolioApi.removerOperacao).toHaveBeenCalledWith('o-1');
  expect(invalidar).toHaveBeenCalledWith({ queryKey: chaves.operacoes });
  expect(invalidar).toHaveBeenCalledWith({ queryKey: chaves.portfolio });
});

it('resolver ativo invalida a watchlist só quando adicionou', async () => {
  const queryClient = criarQueryClientDeTeste();
  const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
  jest.mocked(watchlistApi.listar).mockResolvedValue([itemWatchlist('a-1', 'PETR4')]);
  jest.mocked(watchlistApi.adicionar).mockResolvedValue(itemWatchlist('a-2', 'VALE3'));
  const { result } = await renderHook(() => useResolverAtivo(), { wrapper: criarProvedor(queryClient) });

  await act(async () => {
    await result.current.mutateAsync('PETR4');
  });
  expect(invalidar).not.toHaveBeenCalled();

  await act(async () => {
    await result.current.mutateAsync('VALE3');
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(invalidar).toHaveBeenCalledWith({ queryKey: chaves.watchlist });
});

it('remover da watchlist e definir notificação invalidam a watchlist', async () => {
  const queryClient = criarQueryClientDeTeste();
  const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
  jest.mocked(watchlistApi.remover).mockResolvedValue(undefined);
  jest.mocked(watchlistApi.definirNotificacao).mockResolvedValue(itemWatchlist('a-1', 'PETR4'));
  const remover = await renderHook(() => useRemoverWatchlist(), { wrapper: criarProvedor(queryClient) });
  const definir = await renderHook(() => useDefinirNotificacao(), { wrapper: criarProvedor(queryClient) });

  await act(async () => {
    await remover.result.current.mutateAsync('a-1');
  });
  await waitFor(() => expect(remover.result.current.isSuccess).toBe(true));
  expect(watchlistApi.remover).toHaveBeenCalledWith('a-1');
  expect(invalidar).toHaveBeenCalledWith({ queryKey: chaves.watchlist });

  invalidar.mockClear();
  await act(async () => {
    await definir.result.current.mutateAsync({ ativoId: 'a-1', notificar: false });
  });
  await waitFor(() => expect(definir.result.current.isSuccess).toBe(true));
  expect(watchlistApi.definirNotificacao).toHaveBeenCalledWith('a-1', false);
  expect(invalidar).toHaveBeenCalledWith({ queryKey: chaves.watchlist });
});

it('criar alerta invalida os alertas', async () => {
  const queryClient = criarQueryClientDeTeste();
  const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
  jest.mocked(alertasApi.criar).mockResolvedValue({ id: 'al-1' } as Alerta);
  const { result } = await renderHook(() => useCriarAlerta(), { wrapper: criarProvedor(queryClient) });

  await act(async () => {
    await result.current.mutateAsync({ ticker: 'PETR4', tipo_condicao: 'PRECO_MAIOR_IGUAL', valor_alvo: '40' });
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(invalidar).toHaveBeenCalledWith({ queryKey: chaves.alertas });
});

it('marcar notificação como lida invalida as notificações', async () => {
  const queryClient = criarQueryClientDeTeste();
  const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
  jest.mocked(notificacoesApi.marcarComoLida).mockResolvedValue({ id: 'n-1' } as Notificacao);
  const { result } = await renderHook(() => useMarcarLida(), { wrapper: criarProvedor(queryClient) });

  await act(async () => {
    await result.current.mutateAsync('n-1');
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(notificacoesApi.marcarComoLida).toHaveBeenCalledWith('n-1');
  expect(invalidar).toHaveBeenCalledWith({ queryKey: chaves.notificacoes });
});

it('useNaoLidas conta as não lidas e lista sem argumentos extras', async () => {
  const notificacoes: Notificacao[] = [
    { id: 'n-1', ativo_id: 'a-1', tipo: 'SINAL_ATIVADO', mensagem: 'x', contexto: {}, lida: false, criado_em: '2026-09-25T12:00:00Z' },
    { id: 'n-2', ativo_id: 'a-1', tipo: 'ALERTA_DISPARADO', mensagem: 'y', contexto: {}, lida: true, criado_em: '2026-09-25T12:00:00Z' },
  ];
  jest.mocked(notificacoesApi.listar).mockResolvedValue(notificacoes);
  const { result } = await renderHook(() => useNaoLidas(), { wrapper: criarProvedor() });
  await waitFor(() => expect(result.current).toBe(1));
  // queryFn precisa envolver a chamada: o contexto do TanStack não pode virar `apenasNaoLidas`.
  expect(notificacoesApi.listar).toHaveBeenCalledWith();
});

it('busca só consulta a API com pelo menos 2 caracteres depois do trim', async () => {
  jest.mocked(ativosApi.buscar).mockResolvedValue([]);
  const { result, rerender } = await renderHook(({ termo }: { termo: string }) => useBuscaAtivos(termo), {
    initialProps: { termo: ' P ' },
    wrapper: criarProvedor(),
  });
  expect(result.current.fetchStatus).toBe('idle');
  expect(ativosApi.buscar).not.toHaveBeenCalled();

  await rerender({ termo: ' PE ' });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(ativosApi.buscar).toHaveBeenCalledWith('PE');
});

it('cotação fica desligada sem ativo e chama a API só com o id', async () => {
  jest.mocked(ativosApi.cotacao).mockResolvedValue({ ativo_id: 'a-1' } as unknown as CotacaoAtual);
  const { result, rerender } = await renderHook(({ id }: { id: string | undefined }) => useCotacao(id), {
    initialProps: { id: undefined as string | undefined },
    wrapper: criarProvedor(),
  });
  expect(result.current.fetchStatus).toBe('idle');
  expect(ativosApi.cotacao).not.toHaveBeenCalled();

  await rerender({ id: 'a-1' });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(ativosApi.cotacao).toHaveBeenCalledWith('a-1');
});
