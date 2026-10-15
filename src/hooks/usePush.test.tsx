import { act, renderHook, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AppState } from 'react-native';

import { notificacoesApi } from '@/api/notificacoes';
import { useSincronizarPush, useToquesDoPush } from '@/hooks/usePush';
import { observarMudancaDeToken, observarToques } from '@/notificacoes/push';
import { usePush } from '@/store/push';
import { criarProvedor } from '@/test/renderizar';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));
jest.mock('@/notificacoes/push', () => ({
  lerSuporte: jest.fn(() => ({ suportado: false, motivo: 'expo-go' })),
  prepararPush: jest.fn(),
  configurarExibicaoEmPrimeiroPlano: jest.fn(async () => undefined),
  observarToques: jest.fn(),
  observarMudancaDeToken: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  usePush.getState().reiniciar();
  jest.mocked(observarToques).mockResolvedValue(() => {});
  jest.mocked(observarMudancaDeToken).mockResolvedValue(() => {});
  jest.mocked(notificacoesApi.marcarComoLida).mockResolvedValue({} as never);
});

describe('useSincronizarPush', () => {
  it('sincroniza ao montar e cancela as assinaturas ao desmontar', async () => {
    const sincronizar = jest.spyOn(usePush.getState(), 'sincronizar').mockResolvedValue();
    const cancelarToken = jest.fn();
    jest.mocked(observarMudancaDeToken).mockResolvedValue(cancelarToken);

    const { unmount } = await renderHook(() => useSincronizarPush());
    await waitFor(() => expect(observarMudancaDeToken).toHaveBeenCalled());

    expect(sincronizar).toHaveBeenCalledTimes(1);
    await unmount();
    await waitFor(() => expect(cancelarToken).toHaveBeenCalledTimes(1));
  });

  it('o token que muda sincroniza de novo', async () => {
    const sincronizar = jest.spyOn(usePush.getState(), 'sincronizar').mockResolvedValue();
    let aoMudar: () => void = () => {};
    jest.mocked(observarMudancaDeToken).mockImplementation(async (fn) => {
      aoMudar = fn;
      return () => {};
    });

    await renderHook(() => useSincronizarPush());
    await waitFor(() => expect(observarMudancaDeToken).toHaveBeenCalled());
    aoMudar();

    expect(sincronizar).toHaveBeenCalledTimes(2);
  });

  it('voltar ao primeiro plano com o push negado ou com erro tenta de novo (permissão liberada nas configurações)', async () => {
    const sincronizar = jest.spyOn(usePush.getState(), 'sincronizar').mockResolvedValue();
    let aoMudarEstado: (estado: string) => void = () => {};
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_tipo: string, fn: (estado: string) => void) => {
      aoMudarEstado = fn;
      return { remove: jest.fn() };
    }) as never);
    usePush.setState({ situacao: 'negado' });

    await renderHook(() => useSincronizarPush());
    await waitFor(() => expect(observarMudancaDeToken).toHaveBeenCalled());
    sincronizar.mockClear();
    await act(async () => {
      aoMudarEstado('active');
    });

    expect(sincronizar).toHaveBeenCalledTimes(1);
  });

  it('voltar ao primeiro plano com o push ligado não refaz o registro', async () => {
    const sincronizar = jest.spyOn(usePush.getState(), 'sincronizar').mockResolvedValue();
    let aoMudarEstado: (estado: string) => void = () => {};
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_tipo: string, fn: (estado: string) => void) => {
      aoMudarEstado = fn;
      return { remove: jest.fn() };
    }) as never);
    usePush.setState({ situacao: 'ligado' });

    await renderHook(() => useSincronizarPush());
    await waitFor(() => expect(observarMudancaDeToken).toHaveBeenCalled());
    sincronizar.mockClear();
    await act(async () => {
      aoMudarEstado('active');
    });

    expect(sincronizar).not.toHaveBeenCalled();
  });
});

describe('useToquesDoPush', () => {
  async function montar() {
    let aoToque: (dados: unknown) => void = () => {};
    jest.mocked(observarToques).mockImplementation(async (fn) => {
      aoToque = fn;
      return () => {};
    });
    await renderHook(() => useToquesDoPush(), { wrapper: criarProvedor() });
    await waitFor(() => expect(observarToques).toHaveBeenCalled());
    return (dados: unknown) =>
      act(async () => {
        aoToque(dados);
      });
  }

  it('toque de sinal ou alerta abre o ativo e marca a notificação como lida', async () => {
    const tocar = await montar();

    await tocar({ notificacao_id: 'n-1', tipo: 'ALERTA_DISPARADO', ativo_id: 'a-1' });

    expect(router.push).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1' } });
    await waitFor(() => expect(notificacoesApi.marcarComoLida).toHaveBeenCalledWith('n-1'));
  });

  it('resumo diário abre o detalhe da notificação', async () => {
    const tocar = await montar();

    await tocar({ notificacao_id: 'n-2', tipo: 'RESUMO_DIARIO', ativo_id: null });

    expect(router.push).toHaveBeenCalledWith({ pathname: '/notificacao/[id]', params: { id: 'n-2' } });
  });

  it('dados ausentes ou malformados levam à caixa, sem erro', async () => {
    const tocar = await montar();

    await tocar(undefined);

    expect(router.push).toHaveBeenCalledWith({ pathname: '/notificacoes' });
    expect(notificacoesApi.marcarComoLida).not.toHaveBeenCalled();
  });

  it('navegação que falha não derruba o app', async () => {
    jest.mocked(router.push).mockImplementationOnce(() => {
      throw new Error('navegação ainda não montada');
    });
    const tocar = await montar();

    await expect(tocar({ notificacao_id: 'n-3', ativo_id: 'a-3' })).resolves.not.toThrow();
  });
});
