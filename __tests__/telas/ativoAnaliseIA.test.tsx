import { screen, userEvent } from '@testing-library/react-native';

import { ativosApi } from '@/api/ativos';
import { ApiError } from '@/api/client';
import { iaApi } from '@/api/ia';
import type { AnaliseIA, ItemWatchlist } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { AVISO_IA } from '@/dominio/regulatorio';
import { renderizar } from '@/test/renderizar';

import DetalheAtivo from '../../app/ativo/[id]';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'a-1', ticker: 'PETR4' }),
  router: { back: jest.fn() },
  Stack: { Screen: () => null },
}));
jest.mock('@/components/PainelTecnico', () => ({ PainelTecnico: () => null }));
jest.mock('@/api/ativos', () => ({
  ativosApi: { cotacao: jest.fn(), historico: jest.fn(), indicadores: jest.fn(), sinais: jest.fn(), backtest: jest.fn() },
}));
jest.mock('@/api/watchlist', () => ({
  watchlistApi: { listar: jest.fn(), remover: jest.fn(), definirNotificacao: jest.fn() },
}));
jest.mock('@/api/ia', () => ({ iaApi: { analisar: jest.fn(), conversar: jest.fn() } }));

const item: ItemWatchlist = {
  ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: null, moeda: 'BRL' },
  notificar: true,
  adicionado_em: '2026-09-20T12:00:00Z',
};

const analise: AnaliseIA = {
  ativo_id: 'a-1',
  texto: 'O preço fechou acima da média de 20 pregões.',
  gerado_em: '2026-10-11T15:30:00Z',
  modelo: 'gemini-3.5-flash',
  em_cache: false,
  desatualizada: false,
  aviso_legal: AVISO_IA,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(watchlistApi.listar).mockResolvedValue([item]);
  jest.mocked(ativosApi.cotacao).mockRejectedValue(new ApiError(404, 'Cotacao nao encontrada para o ativo'));
  jest.mocked(ativosApi.historico).mockResolvedValue([]);
  jest.mocked(ativosApi.indicadores).mockResolvedValue([]);
  jest.mocked(ativosApi.sinais).mockResolvedValue([]);
});

it('abrir o ativo não gasta cota: a análise só vem do botão', async () => {
  await renderizar(<DetalheAtivo />);

  expect(await screen.findByRole('button', { name: 'Gerar análise por IA' })).toBeOnTheScreen();
  expect(iaApi.analisar).not.toHaveBeenCalled();
});

it('o botão pede a análise do ativo e mostra o texto com o aviso legal', async () => {
  const user = userEvent.setup();
  jest.mocked(iaApi.analisar).mockResolvedValue(analise);
  await renderizar(<DetalheAtivo />);

  await user.press(await screen.findByRole('button', { name: 'Gerar análise por IA' }));

  expect(await screen.findByText(analise.texto)).toBeOnTheScreen();
  expect(iaApi.analisar).toHaveBeenCalledWith('a-1');
  expect(screen.getByText('Modelo: gemini-3.5-flash')).toBeOnTheScreen();
  expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
});

it('IA desligada ou sem cota: mensagem legível e o resto da tela segue inteiro', async () => {
  const user = userEvent.setup();
  jest.mocked(iaApi.analisar).mockRejectedValue(new ApiError(503, 'Cota do provedor de IA excedida', { retryAfterSegundos: 45 }));
  await renderizar(<DetalheAtivo />);

  await user.press(await screen.findByRole('button', { name: 'Gerar análise por IA' }));

  expect(
    await screen.findByText('O limite de uso da IA foi atingido. Tente novamente em 45 s.'),
  ).toBeOnTheScreen();
  expect(screen.getByText('Indicadores técnicos')).toBeOnTheScreen();
  expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
  expect(iaApi.analisar).toHaveBeenCalledTimes(1);
});
