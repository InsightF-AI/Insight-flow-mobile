import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

import { notificacoesApi } from '@/api/notificacoes';
import type { Notificacao } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { useSessao } from '@/store/sessao';
import { renderizar } from '@/test/renderizar';

import Perfil from '../../app/(tabs)/perfil';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn() } }));

const armazenamento = (SecureStore as unknown as { __armazenamento: Map<string, string> }).__armazenamento;

const naoLida: Notificacao = {
  id: 'n-1',
  ativo_id: 'a-1',
  tipo: 'SINAL_ATIVADO',
  mensagem: 'Sobrevenda RSI ativado em PETR4',
  lida: false,
  criado_em: '2026-09-25T15:30:00Z',
};
const lidaDeAtivoRemovido: Notificacao = {
  id: 'n-2',
  ativo_id: 'a-9',
  tipo: 'ALERTA_DISPARADO',
  mensagem: 'Preço atingiu o alvo',
  lida: true,
  criado_em: '2026-09-24T15:30:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  armazenamento.clear();
  useSessao.setState({ status: 'autenticado', token: 'tok', email: 'ana@exemplo.com' });
  jest.mocked(watchlistApi.listar).mockResolvedValue([
    {
      ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: null, moeda: 'BRL' },
      notificar: true,
      adicionado_em: '2026-09-20T12:00:00Z',
    },
  ]);
  jest.mocked(notificacoesApi.listar).mockResolvedValue([naoLida, lidaDeAtivoRemovido]);
  jest.mocked(notificacoesApi.marcarComoLida).mockResolvedValue({ ...naoLida, lida: true });
});

it('mostra o e-mail e as notificações, com ticker quando conhecido', async () => {
  await renderizar(<Perfil />);
  expect(await screen.findByText('ana@exemplo.com')).toBeOnTheScreen();
  expect(await screen.findByText('Sinal técnico · PETR4')).toBeOnTheScreen();
  expect(screen.getByText('Alerta de preço')).toBeOnTheScreen();
});

it('tocar numa não lida marca como lida e abre o ativo', async () => {
  const user = userEvent.setup();
  await renderizar(<Perfil />);
  await user.press(
    await screen.findByRole('button', { name: 'Não lida. Sinal técnico · PETR4. Sobrevenda RSI ativado em PETR4' }),
  );
  await waitFor(() => expect(notificacoesApi.marcarComoLida).toHaveBeenCalledWith('n-1'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1', ticker: 'PETR4' } });
});

it('sair pede confirmação e encerra a sessão', async () => {
  const user = userEvent.setup();
  jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensagem, botoes) => {
    botoes?.find((botao) => botao.style === 'destructive')?.onPress?.();
  });
  await renderizar(<Perfil />);
  await user.press(await screen.findByRole('button', { name: 'Sair' }));
  await waitFor(() => expect(useSessao.getState().status).toBe('anonimo'));
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
