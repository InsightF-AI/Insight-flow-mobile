import { fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';

import { authApi } from '@/api/auth';
import { dispositivosApi } from '@/api/dispositivos';
import { testarConexao } from '@/api/saude';
import type { ItemWatchlist } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { usePreferencias } from '@/store/preferencias';
import { usePush } from '@/store/push';
import { useSessao } from '@/store/sessao';
import { renderizar } from '@/test/renderizar';

import Perfil from '../../app/(tabs)/perfil';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/auth', () => ({ authApi: { sair: jest.fn(), renovar: jest.fn() } }));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(async () => []), marcarComoLida: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({
  watchlistApi: { listar: jest.fn(), definirNotificacao: jest.fn(), remover: jest.fn() },
}));
jest.mock('@/api/dispositivos', () => ({ dispositivosApi: { registrar: jest.fn(), remover: jest.fn() } }));
jest.mock('@/api/saude', () => ({ testarConexao: jest.fn() }));
jest.mock('@/notificacoes/push', () => ({
  lerSuporte: jest.fn(() => ({ suportado: true, projectId: 'proj-1' })),
  prepararPush: jest.fn(async () => ({ estado: 'pronto', token: 'ExponentPushToken[abc]' })),
  configurarExibicaoEmPrimeiroPlano: jest.fn(async () => undefined),
}));

const itens: ItemWatchlist[] = [
  {
    ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-09-20T12:00:00Z',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  usePreferencias.setState({ tema: 'escuro', pushLigado: true });
  useSessao.setState({ status: 'autenticado', token: 'tok', refreshToken: 'ref', expiraEm: null, email: 'ana@exemplo.com' });
  usePush.setState({ situacao: 'ligado', motivo: null, token: 'ExponentPushToken[abc]', erro: null });
  jest.mocked(watchlistApi.listar).mockResolvedValue(itens);
  jest.mocked(authApi.sair).mockResolvedValue(undefined);
  jest.mocked(dispositivosApi.remover).mockResolvedValue(undefined);
  jest.mocked(dispositivosApi.registrar).mockResolvedValue({ token: 'ExponentPushToken[abc]', ativo: true });
});

describe('push', () => {
  it('mostra o estado e desliga: remove o aparelho no servidor e guarda a preferência', async () => {
    await renderizar(<Perfil />);

    expect(await screen.findByText('Ligadas neste aparelho')).toBeOnTheScreen();
    await fireEvent(screen.getByRole('switch', { name: 'Notificações push' }), 'valueChange', false);

    await waitFor(() => expect(dispositivosApi.remover).toHaveBeenCalledWith('ExponentPushToken[abc]'));
    expect(usePreferencias.getState().pushLigado).toBe(false);
    expect(await screen.findByText('Desligadas neste aparelho')).toBeOnTheScreen();
  });

  it('ligar de novo registra o aparelho', async () => {
    usePreferencias.setState({ pushLigado: false });
    usePush.setState({ situacao: 'desligado', token: null });
    await renderizar(<Perfil />);

    await fireEvent(await screen.findByRole('switch', { name: 'Notificações push' }), 'valueChange', true);

    await waitFor(() => expect(dispositivosApi.registrar).toHaveBeenCalledWith('ExponentPushToken[abc]'));
    expect(await screen.findByText('Ligadas neste aparelho')).toBeOnTheScreen();
  });

  it('negado: abre as configurações do sistema', async () => {
    const user = userEvent.setup();
    const abrir = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    usePush.setState({ situacao: 'negado', token: null });
    await renderizar(<Perfil />);

    await user.press(await screen.findByRole('button', { name: 'Abrir configurações do sistema' }));

    expect(abrir).toHaveBeenCalledTimes(1);
  });

  it('Expo Go: explica e não deixa ligar', async () => {
    usePush.setState({ situacao: 'indisponivel', motivo: 'expo-go', token: null });
    await renderizar(<Perfil />);

    expect(await screen.findByText(/development build/)).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Notificações push' })).toBeDisabled();
  });
});

describe('notificar por ativo', () => {
  it('altera no servidor e a falha devolve o interruptor', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(watchlistApi.definirNotificacao).mockRejectedValue(new Error('falhou'));
    await renderizar(<Perfil />);

    await fireEvent(await screen.findByRole('switch', { name: 'Notificar PETR4' }), 'valueChange', false);

    await waitFor(() => expect(watchlistApi.definirNotificacao).toHaveBeenCalledWith('a-1', false));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Notificar PETR4' })).toBeChecked());
  });
});

describe('servidor', () => {
  it('mostra o endereço em uso e o resultado do teste de conexão', async () => {
    const user = userEvent.setup();
    jest.mocked(testarConexao).mockResolvedValue({ ok: true, ms: 37 });
    await renderizar(<Perfil />);

    await user.press(await screen.findByRole('button', { name: 'Testar conexão' }));

    expect(await screen.findByText('Conectado (37 ms)')).toBeOnTheScreen();
    expect(testarConexao).toHaveBeenCalledWith(expect.stringMatching(/^https?:\/\//));
  });
});

describe('sair', () => {
  it('remove o aparelho do push ANTES de encerrar a sessão, e a preferência não muda', async () => {
    const user = userEvent.setup();
    let statusNaRemocao: string | undefined;
    jest.mocked(dispositivosApi.remover).mockImplementation(async () => {
      statusNaRemocao = useSessao.getState().status;
    });
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, botoes) => {
      botoes?.find((botao) => botao.style === 'destructive')?.onPress?.();
    });
    await renderizar(<Perfil />);

    await user.press(await screen.findByRole('button', { name: 'Sair' }));

    await waitFor(() => expect(useSessao.getState().status).toBe('anonimo'));
    expect(dispositivosApi.remover).toHaveBeenCalledWith('ExponentPushToken[abc]');
    expect(statusNaRemocao).toBe('autenticado');
    expect(usePreferencias.getState().pushLigado).toBe(true);
  });

  it('um servidor que não responde não segura a saída por mais de 4 s', async () => {
    jest.useFakeTimers();
    try {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      jest.mocked(dispositivosApi.remover).mockReturnValue(new Promise(() => {}));
      jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, botoes) => {
        botoes?.find((botao) => botao.style === 'destructive')?.onPress?.();
      });
      await renderizar(<Perfil />);

      await user.press(await screen.findByRole('button', { name: 'Sair' }));
      expect(useSessao.getState().status).toBe('autenticado');
      await jest.advanceTimersByTimeAsync(4_000);

      await waitFor(() => expect(useSessao.getState().status).toBe('anonimo'));
    } finally {
      jest.useRealTimers();
    }
  });
});
