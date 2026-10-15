import { act, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';

import { notificacoesApi } from '@/api/notificacoes';
import type { Notificacao } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { DURACAO_DO_BANNER_MS, useBannerNotificacao } from '@/hooks/useBannerNotificacao';
import { useBanner } from '@/store/banner';
import { criarProvedor } from '@/test/renderizar';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn() } }));

const alerta: Notificacao = {
  id: 'n-1',
  ativo_id: 'a-1',
  tipo: 'ALERTA_DISPARADO',
  mensagem: 'PETR4 atingiu R$ 40,00',
  contexto: {},
  lida: false,
  criado_em: '2026-10-10T12:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  useBanner.setState({ atual: null });
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  jest.mocked(notificacoesApi.marcarComoLida).mockResolvedValue({ ...alerta, lida: true });
});

afterEach(() => {
  jest.useRealTimers();
});

it('sem notificação recebida não há banner', async () => {
  const { result } = await renderHook(() => useBannerNotificacao(), { wrapper: criarProvedor() });
  expect(result.current.banner).toBeNull();
});

it('monta o título com o ticker e some sozinho depois do tempo de exibição', async () => {
  const { result } = await renderHook(() => useBannerNotificacao(), { wrapper: criarProvedor() });
  await act(async () => {
    useBanner.getState().mostrar(alerta, 'PETR4');
  });
  expect(result.current.banner).toEqual({ titulo: 'Alerta de preço · PETR4', mensagem: 'PETR4 atingiu R$ 40,00' });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(DURACAO_DO_BANNER_MS);
  });
  expect(result.current.banner).toBeNull();
});

it('tocar no banner dispensa, marca como lida e abre o ativo', async () => {
  const { result } = await renderHook(() => useBannerNotificacao(), { wrapper: criarProvedor() });
  await act(async () => {
    useBanner.getState().mostrar(alerta, 'PETR4');
  });
  await act(async () => {
    result.current.aoPressionar();
  });
  expect(useBanner.getState().atual).toBeNull();
  expect(notificacoesApi.marcarComoLida).toHaveBeenCalledWith('n-1');
  expect(router.push).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1' } });
});

it('um banner novo reinicia o tempo de exibição', async () => {
  const { result } = await renderHook(() => useBannerNotificacao(), { wrapper: criarProvedor() });
  await act(async () => {
    useBanner.getState().mostrar(alerta, null);
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(DURACAO_DO_BANNER_MS - 1_000);
  });
  await act(async () => {
    useBanner.getState().mostrar({ ...alerta, id: 'n-2' }, null);
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(DURACAO_DO_BANNER_MS - 1_000);
  });
  expect(result.current.banner).not.toBeNull();
});

it('ao desmontar (logout) descarta o banner pendente: ele não reaparece no próximo login', async () => {
  const { unmount } = await renderHook(() => useBannerNotificacao(), { wrapper: criarProvedor() });
  await act(async () => {
    useBanner.getState().mostrar(alerta, 'PETR4');
  });
  expect(useBanner.getState().atual).not.toBeNull();
  await unmount();
  expect(useBanner.getState().atual).toBeNull();
});
