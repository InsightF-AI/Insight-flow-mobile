import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

import { authApi } from '@/api/auth';
import { notificacoesApi } from '@/api/notificacoes';
import type { Notificacao } from '@/api/tipos';
import { usePreferencias } from '@/store/preferencias';
import { useSessao } from '@/store/sessao';
import { renderizar } from '@/test/renderizar';
import { coresClaro, coresEscuro } from '@/theme/cores';

import Perfil from '../../app/(tabs)/perfil';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/auth', () => ({ authApi: { sair: jest.fn(), renovar: jest.fn() } }));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({
  watchlistApi: { listar: jest.fn(async () => []), definirNotificacao: jest.fn(), remover: jest.fn() },
}));
jest.mock('@/api/dispositivos', () => ({ dispositivosApi: { registrar: jest.fn(), remover: jest.fn() } }));
jest.mock('@/notificacoes/push', () => ({
  lerSuporte: jest.fn(() => ({ suportado: false, motivo: 'expo-go' })),
  prepararPush: jest.fn(),
  configurarExibicaoEmPrimeiroPlano: jest.fn(async () => undefined),
}));

const armazenamento = (SecureStore as unknown as { __armazenamento: Map<string, string> }).__armazenamento;

const naoLida: Notificacao = {
  id: 'n-1',
  ativo_id: 'a-1',
  tipo: 'SINAL_ATIVADO',
  mensagem: 'Sobrevenda RSI ativado em PETR4',
  contexto: {},
  lida: false,
  criado_em: '2026-09-25T15:30:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  armazenamento.clear();
  usePreferencias.setState({ tema: 'escuro' });
  useSessao.setState({ status: 'autenticado', token: 'tok', refreshToken: 'ref', expiraEm: null, email: 'ana@exemplo.com' });
  jest.mocked(authApi.sair).mockResolvedValue(undefined);
  jest.mocked(notificacoesApi.listar).mockResolvedValue([naoLida]);
});

it('mostra o e-mail e leva à caixa de notificações com a contagem de não lidas', async () => {
  const user = userEvent.setup();
  await renderizar(<Perfil />);
  expect(await screen.findByText('ana@exemplo.com')).toBeOnTheScreen();
  expect(await screen.findByText('1 não lida')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Abrir notificações' }));
  expect(router.push).toHaveBeenCalledWith('/notificacoes');
});

it('sem notificações não lidas a contagem diz isso', async () => {
  jest.mocked(notificacoesApi.listar).mockResolvedValue([{ ...naoLida, lida: true }]);
  await renderizar(<Perfil />);
  expect(await screen.findByText('Nenhuma não lida')).toBeOnTheScreen();
});

it('sair pede confirmação e encerra a sessão', async () => {
  const user = userEvent.setup();
  jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensagem, botoes) => {
    botoes?.find((botao) => botao.style === 'destructive')?.onPress?.();
  });
  await renderizar(<Perfil />);
  await user.press(await screen.findByRole('button', { name: 'Sair' }));
  await waitFor(() => expect(useSessao.getState().status).toBe('anonimo'));
  expect(authApi.sair).toHaveBeenCalledWith('ref');
});

it('sair encerra a sessão mesmo se o armazenamento seguro falhar, sem rejeição não tratada', async () => {
  const user = userEvent.setup();
  jest.spyOn(SecureStore, 'deleteItemAsync').mockRejectedValue(new Error('falha no armazenamento'));
  jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensagem, botoes) => {
    botoes?.find((botao) => botao.style === 'destructive')?.onPress?.();
  });
  await renderizar(<Perfil />);
  await user.press(await screen.findByRole('button', { name: 'Sair' }));
  await waitFor(() => expect(SecureStore.deleteItemAsync).toHaveBeenCalled());
  await waitFor(() => expect(useSessao.getState().status).toBe('anonimo'));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'Não foi possível concluir a saída',
      expect.stringContaining('encerrada neste aparelho'),
    ),
  );
  // Sem o `.catch` em perfil.tsx a rejeição de `sair` fica sem tratamento e o Jest reprova o teste em curso ao detectá-la.
  // O Node só a detecta depois de esvaziar as microtarefas, então cedemos voltas do laço de eventos antes de terminar
  // para que a detecção aconteça aqui dentro e não escape para depois do fim do teste.
  await new Promise<void>((resolver) => setImmediate(resolver));
  await new Promise<void>((resolver) => setImmediate(resolver));
});

describe('Aparência (tema)', () => {
  it('abre no escuro por padrão', async () => {
    await renderizar(<Perfil />);
    expect(await screen.findByRole('radio', { name: 'Escuro' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Claro' })).not.toBeChecked();
  });

  it('alternar para claro reestiliza a tela na hora e persiste a escolha', async () => {
    const user = userEvent.setup();
    await renderizar(<Perfil />);
    const titulo = await screen.findByRole('heading', { name: 'Aparência' });
    expect(titulo).toHaveStyle({ color: coresEscuro.texto });

    await user.press(screen.getByRole('radio', { name: 'Claro' }));

    expect(screen.getByRole('radio', { name: 'Claro' })).toBeChecked();
    expect(screen.getByRole('heading', { name: 'Aparência' })).toHaveStyle({ color: coresClaro.texto });
    expect(usePreferencias.getState().tema).toBe('claro');
    expect(armazenamento.get('insightflow.tema')).toBe('claro');
  });

  it('voltar para escuro também persiste', async () => {
    const user = userEvent.setup();
    usePreferencias.setState({ tema: 'claro' });
    await renderizar(<Perfil />);
    await user.press(await screen.findByRole('radio', { name: 'Escuro' }));
    expect(armazenamento.get('insightflow.tema')).toBe('escuro');
  });
});
