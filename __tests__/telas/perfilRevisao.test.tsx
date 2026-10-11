import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { ApiError } from '@/api/client';
import { dispositivosApi } from '@/api/dispositivos';
import type { ItemWatchlist } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { usePreferencias } from '@/store/preferencias';
import { usePush } from '@/store/push';
import { useSessao } from '@/store/sessao';
import { renderizar } from '@/test/renderizar';

import Perfil from '../../app/(tabs)/perfil';

// Achados da revisão independente da Etapa 8 que aparecem na tela do Perfil.
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
  {
    ativo: { id: 'a-2', ticker: 'VALE3', nome: 'Vale ON', tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar: false,
    adicionado_em: '2026-09-21T12:00:00Z',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  usePreferencias.setState({ tema: 'escuro', pushLigado: true });
  useSessao.setState({ status: 'autenticado', token: 'tok', refreshToken: 'ref', expiraEm: null, email: 'ana@exemplo.com' });
  usePush.setState({ situacao: 'ligado', motivo: null, token: 'ExponentPushToken[abc]', erro: null });
  jest.mocked(watchlistApi.listar).mockResolvedValue(itens);
});

it('desligar sem conseguir remover o aparelho avisa e mantém o interruptor ligado', async () => {
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(dispositivosApi.remover).mockRejectedValue(new ApiError(0, 'Sem conexão', { causa: 'rede' }));
  await renderizar(<Perfil />);

  await fireEvent(await screen.findByRole('switch', { name: 'Notificações push' }), 'valueChange', false);

  await waitFor(() =>
    expect(alerta).toHaveBeenCalledWith('Não foi possível desligar as notificações push', 'Sem conexão'),
  );
  expect(usePreferencias.getState().pushLigado).toBe(true);
  expect(screen.getByText('Ligadas neste aparelho')).toBeOnTheScreen();
});

it('duas alterações seguidas: a falha da primeira também é avisada', async () => {
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(watchlistApi.definirNotificacao).mockImplementation(async (ativoId) => {
    if (ativoId === 'a-1') throw new ApiError(500, 'Erro 500');
    return { ...itens[1], notificar: true };
  });
  await renderizar(<Perfil />);
  const petr = await screen.findByRole('switch', { name: 'Notificar PETR4' });
  const vale = screen.getByRole('switch', { name: 'Notificar VALE3' });

  await fireEvent(petr, 'valueChange', false);
  await fireEvent(vale, 'valueChange', true);

  await waitFor(() =>
    expect(alerta).toHaveBeenCalledWith(
      'Não foi possível alterar as notificações',
      'Erro no servidor. Tente novamente em instantes.',
    ),
  );
});
