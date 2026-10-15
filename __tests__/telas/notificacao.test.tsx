import { screen } from '@testing-library/react-native';

import { notificacoesApi } from '@/api/notificacoes';
import type { Notificacao } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { AVISO_IA } from '@/dominio/regulatorio';
import { renderizar } from '@/test/renderizar';

import DetalheNotificacao from '../../app/notificacao/[id]';

let mockIdDaRota = 'n-9';
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockIdDaRota }),
  router: { push: jest.fn() },
}));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn() } }));

const resumo: Notificacao = {
  id: 'n-9',
  ativo_id: null,
  tipo: 'RESUMO_DIARIO',
  mensagem: 'Resumo diario da carteira',
  contexto: { texto: 'A carteira fechou o dia estável.', aviso_legal: 'Análise gerada por IA. Não é recomendação.' },
  lida: true,
  criado_em: '2026-10-09T21:30:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockIdDaRota = 'n-9';
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
});

it('resumo diário mostra o texto completo e o aviso legal', async () => {
  jest.mocked(notificacoesApi.listar).mockResolvedValue([resumo]);
  await renderizar(<DetalheNotificacao />);
  expect(await screen.findByText('A carteira fechou o dia estável.')).toBeOnTheScreen();
  expect(screen.getByText('Análise gerada por IA. Não é recomendação.')).toBeOnTheScreen();
});

it('resumo sem aviso legal do servidor usa o aviso padrão', async () => {
  jest
    .mocked(notificacoesApi.listar)
    .mockResolvedValue([{ ...resumo, contexto: { texto: 'A carteira fechou o dia estável.' } }]);
  await renderizar(<DetalheNotificacao />);
  expect(await screen.findByText(AVISO_IA)).toBeOnTheScreen();
});

it('resumo sem texto não quebra e explica', async () => {
  jest.mocked(notificacoesApi.listar).mockResolvedValue([{ ...resumo, contexto: {} }]);
  await renderizar(<DetalheNotificacao />);
  expect(await screen.findByText('Esta notificação não tem texto para mostrar.')).toBeOnTheScreen();
});

it('notificação inexistente mostra aviso em vez de tela em branco', async () => {
  mockIdDaRota = 'n-404';
  jest.mocked(notificacoesApi.listar).mockResolvedValue([resumo]);
  await renderizar(<DetalheNotificacao />);
  expect(await screen.findByText('Notificação não encontrada.')).toBeOnTheScreen();
});
