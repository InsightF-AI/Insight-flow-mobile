import { screen } from '@testing-library/react-native';

import { ativosApi } from '@/api/ativos';
import { ApiError } from '@/api/client';
import { watchlistApi } from '@/api/watchlist';
import { AVISO_IA } from '@/dominio/regulatorio';
import { renderizar } from '@/test/renderizar';

import DetalheAtivo from '../../app/ativo/[id]';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'a-1', ticker: 'PETR4' }),
  router: { back: jest.fn() },
  Stack: { Screen: () => null },
}));
// O gráfico usa Skia, que não roda no Jest.
jest.mock('@/components/GraficoPreco', () => ({ GraficoPreco: () => null }));
jest.mock('@/api/ativos', () => ({
  ativosApi: { cotacao: jest.fn(), historico: jest.fn(), indicadores: jest.fn(), sinais: jest.fn(), backtest: jest.fn() },
}));
jest.mock('@/api/watchlist', () => ({
  watchlistApi: { listar: jest.fn(), remover: jest.fn(), definirNotificacao: jest.fn() },
}));

it('mostra cotação indisponível, indicadores, sinal com histórico e o aviso de IA', async () => {
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  jest.mocked(ativosApi.cotacao).mockRejectedValue(new ApiError(404, 'Cotacao nao encontrada para o ativo'));
  jest.mocked(ativosApi.historico).mockResolvedValue([]);
  jest.mocked(ativosApi.indicadores).mockResolvedValue([
    { tipo: 'RSI', parametros: { periodo: 14 }, data_calculo: '2026-09-25T12:00:00Z', valor: '25.1', valores_auxiliares: null },
  ]);
  jest.mocked(ativosApi.sinais).mockResolvedValue([
    {
      id: 's-1',
      ativo_id: 'a-1',
      regra_id: 'r-1',
      regra_nome: 'Sobrevenda RSI',
      regra_descricao: 'RSI(14) abaixo de 30 — condição técnica de sobrevenda.',
      data_ativacao: '2026-09-25T12:00:00Z',
      contexto: {},
      data_desativacao: null,
    },
  ]);
  jest.mocked(ativosApi.backtest).mockResolvedValue({
    regra_id: 'r-1',
    ativo_id: 'a-1',
    total_ocorrencias: 4,
    retorno_medio_5_pregoes: '1.2',
    retorno_medio_20_pregoes: null,
    retorno_medio_60_pregoes: '-3',
  });

  await renderizar(<DetalheAtivo />);

  expect(await screen.findByText('Sem cotação disponível para este ativo.')).toBeOnTheScreen();
  expect(await screen.findByText('Zona de sobrevenda (abaixo de 30)')).toBeOnTheScreen();
  expect(await screen.findByText('Sobrevenda RSI')).toBeOnTheScreen();
  expect(await screen.findByText('+1,20%')).toBeOnTheScreen();
  expect(screen.getByText('Dados insuficientes para o gráfico neste período.')).toBeOnTheScreen();
  expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
  expect(ativosApi.backtest).toHaveBeenCalledWith('a-1', 'r-1');
});
