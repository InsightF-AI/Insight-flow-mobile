import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { ApiError } from '@/api/client';
import { notificacoesApi } from '@/api/notificacoes';
import type { Notificacao } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { renderizar } from '@/test/renderizar';

import Notificacoes from '../../app/notificacoes';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn() } }));

function notificacao(id: string, parcial: Partial<Notificacao> = {}): Notificacao {
  return {
    id,
    ativo_id: 'a-1',
    tipo: 'SINAL_ATIVADO',
    mensagem: `Sobrevenda RSI ativado em PETR4 (${id})`,
    contexto: {},
    lida: false,
    criado_em: '2026-10-10T12:00:00Z',
    ...parcial,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  jest.mocked(watchlistApi.listar).mockResolvedValue([
    {
      ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: null, moeda: 'BRL' },
      notificar: true,
      adicionado_em: '2026-10-01T12:00:00Z',
    },
  ]);
  jest.mocked(notificacoesApi.marcarComoLida).mockImplementation(async (id) => notificacao(id, { lida: true }));
});

it('abre nas não lidas e a aba "Todas" mostra também as lidas', async () => {
  const user = userEvent.setup();
  jest.mocked(notificacoesApi.listar).mockResolvedValue([notificacao('n-1'), notificacao('n-2', { lida: true })]);
  await renderizar(<Notificacoes />);
  expect(await screen.findByText('Sobrevenda RSI ativado em PETR4 (n-1)')).toBeOnTheScreen();
  expect(screen.queryByText('Sobrevenda RSI ativado em PETR4 (n-2)')).not.toBeOnTheScreen();
  await user.press(screen.getByRole('radio', { name: 'Todas' }));
  expect(await screen.findByText('Sobrevenda RSI ativado em PETR4 (n-2)')).toBeOnTheScreen();
});

it('toque abre o ativo com o ticker e marca como lida', async () => {
  const user = userEvent.setup();
  jest.mocked(notificacoesApi.listar).mockResolvedValue([notificacao('n-1')]);
  await renderizar(<Notificacoes />);
  await user.press(await screen.findByRole('button', { name: /Não lida\. Sinal técnico · PETR4/ }));
  await waitFor(() => expect(notificacoesApi.marcarComoLida).toHaveBeenCalledWith('n-1'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1', ticker: 'PETR4' } });
});

it('resumo diário abre o detalhe da notificação', async () => {
  const user = userEvent.setup();
  const resumo = notificacao('n-9', { ativo_id: null, tipo: 'RESUMO_DIARIO', mensagem: 'Resumo diario da carteira' });
  jest.mocked(notificacoesApi.listar).mockResolvedValue([resumo]);
  await renderizar(<Notificacoes />);
  await user.press(await screen.findByRole('button', { name: /Resumo diário/ }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/notificacao/[id]', params: { id: 'n-9' } });
});

it('notificação de ativo que saiu da watchlist abre o ativo sem inventar ticker', async () => {
  const user = userEvent.setup();
  jest.mocked(notificacoesApi.listar).mockResolvedValue([notificacao('n-1', { ativo_id: 'a-9' })]);
  await renderizar(<Notificacoes />);
  await user.press(await screen.findByRole('button', { name: /Não lida\. Sinal técnico\./ }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-9' } });
});

it('"Marcar todas como lidas" marca cada não lida e some quando não há nenhuma', async () => {
  const user = userEvent.setup();
  jest
    .mocked(notificacoesApi.listar)
    .mockResolvedValueOnce([notificacao('n-1'), notificacao('n-2')])
    .mockResolvedValue([notificacao('n-1', { lida: true }), notificacao('n-2', { lida: true })]);
  await renderizar(<Notificacoes />);
  await user.press(await screen.findByRole('button', { name: 'Marcar todas como lidas' }));
  await waitFor(() => expect(notificacoesApi.marcarComoLida).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Marcar todas como lidas' })).not.toBeOnTheScreen());
});

it('falha parcial ao marcar todas é dita ao usuário', async () => {
  const user = userEvent.setup();
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(notificacoesApi.listar).mockResolvedValue([notificacao('n-1'), notificacao('n-2')]);
  jest
    .mocked(notificacoesApi.marcarComoLida)
    .mockResolvedValueOnce(notificacao('n-1', { lida: true }))
    .mockRejectedValueOnce(new ApiError(500, 'Falha no servidor'));
  await renderizar(<Notificacoes />);
  await user.press(await screen.findByRole('button', { name: 'Marcar todas como lidas' }));
  await waitFor(() =>
    expect(alerta).toHaveBeenCalledWith(
      'Algumas notificações não foram marcadas',
      '1 de 2 não puderam ser marcadas como lidas. Tente novamente.',
    ),
  );
});

it('lista vazia, carregando e erro têm estado próprio', async () => {
  jest.mocked(notificacoesApi.listar).mockResolvedValue([]);
  await renderizar(<Notificacoes />);
  expect(await screen.findByText('Nenhuma notificação não lida.')).toBeOnTheScreen();
});

it('erro ao carregar mostra a mensagem com tentar de novo', async () => {
  jest.mocked(notificacoesApi.listar).mockRejectedValue(new ApiError(500, 'Falha no servidor'));
  await renderizar(<Notificacoes />);
  expect(await screen.findByRole('button', { name: 'Tentar novamente' })).toBeOnTheScreen();
});
