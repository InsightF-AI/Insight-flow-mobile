import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { ativosApi } from '@/api/ativos';
import { ApiError } from '@/api/client';
import { watchlistApi } from '@/api/watchlist';
import type { ItemWatchlist } from '@/api/tipos';
import { AVISO_IA } from '@/dominio/regulatorio';
import { renderizar } from '@/test/renderizar';

import DetalheAtivo from '../../app/ativo/[id]';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'a-1', ticker: 'PETR4' }),
  router: { back: jest.fn() },
  // Renderiza o botão do cabeçalho para os testes poderem tocá-lo.
  Stack: { Screen: ({ options }: { options?: { headerRight?: () => unknown } }) => options?.headerRight?.() ?? null },
}));
// O gráfico usa Skia, que não roda no Jest: o painel é um stub que mostra quantos candles recebeu.
jest.mock('@/components/PainelTecnico', () => ({
  PainelTecnico: ({ analise }: { analise: { candles: unknown[] } }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{`painel com ${analise.candles.length} candles`}</Text>;
  },
}));
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

const itemWatchlist: ItemWatchlist = {
  ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: null, moeda: 'BRL' },
  notificar: true,
  adicionado_em: '2026-09-20T12:00:00Z',
};

function prepararAtivoNaWatchlist() {
  jest.mocked(watchlistApi.listar).mockResolvedValue([itemWatchlist]);
  jest.mocked(ativosApi.cotacao).mockRejectedValue(new ApiError(404, 'Cotacao nao encontrada para o ativo'));
  jest.mocked(ativosApi.historico).mockResolvedValue([]);
  jest.mocked(ativosApi.indicadores).mockResolvedValue([]);
  jest.mocked(ativosApi.sinais).mockResolvedValue([]);
}

describe('botão de notificações do cabeçalho', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    prepararAtivoNaWatchlist();
  });

  it('avisa quando a API falha ao alterar as notificações', async () => {
    const user = userEvent.setup();
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(watchlistApi.definirNotificacao).mockRejectedValue(new ApiError(500, 'Falha no servidor'));
    await renderizar(<DetalheAtivo />);

    await user.press(await screen.findByRole('button', { name: 'Desativar notificações' }));

    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Não foi possível alterar as notificações', 'Erro no servidor. Tente novamente em instantes.'));
  });

  it('ignora toques enquanto a alteração está pendente', async () => {
    const user = userEvent.setup();
    let concluir: (item: ItemWatchlist) => void = () => {};
    jest.mocked(watchlistApi.definirNotificacao).mockReturnValue(
      new Promise<ItemWatchlist>((resolver) => {
        concluir = resolver;
      }),
    );
    await renderizar(<DetalheAtivo />);

    await user.press(await screen.findByRole('button', { name: 'Desativar notificações' }));
    // A alteração é otimista: o rótulo já vira, mas um segundo toque enquanto o PATCH não volta é ignorado.
    await user.press(await screen.findByRole('button', { name: 'Ativar notificações' }));

    expect(watchlistApi.definirNotificacao).toHaveBeenCalledTimes(1);
    jest.mocked(watchlistApi.listar).mockResolvedValue([{ ...itemWatchlist, notificar: false }]);
    concluir({ ...itemWatchlist, notificar: false });
    expect(await screen.findByRole('button', { name: 'Ativar notificações' })).toBeOnTheScreen();
  });
});

function pontoDoDia(dia: number, fechamento: number) {
  const data = new Date(Date.UTC(2026, 8, dia)).toISOString();
  return {
    data,
    abertura: String(fechamento),
    maxima: String(fechamento + 1),
    minima: String(fechamento - 1),
    fechamento: String(fechamento),
    volume: '100',
  };
}

describe('gráfico técnico', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    prepararAtivoNaWatchlist();
  });

  it('mostra o painel quando o histórico tem candles suficientes', async () => {
    jest.mocked(ativosApi.historico).mockResolvedValue([pontoDoDia(1, 10), pontoDoDia(2, 11), pontoDoDia(3, 12)]);
    await renderizar(<DetalheAtivo />);
    expect(await screen.findByText('painel com 3 candles')).toBeOnTheScreen();
  });

  it('pede também o histórico 5A como aquecimento das médias', async () => {
    jest.mocked(ativosApi.historico).mockResolvedValue([pontoDoDia(1, 10), pontoDoDia(2, 11)]);
    await renderizar(<DetalheAtivo />);
    await screen.findByText('painel com 2 candles');
    expect(ativosApi.historico).toHaveBeenCalledWith('a-1', '1M');
    await waitFor(() => expect(ativosApi.historico).toHaveBeenCalledWith('a-1', '5A'));
  });

  it('o gráfico aparece mesmo se o aquecimento 5A falhar', async () => {
    jest.mocked(ativosApi.historico).mockImplementation(async (_id: string, periodo: string) => {
      if (periodo === '5A') throw new ApiError(503, 'Fonte de dados de mercado indisponivel');
      return [pontoDoDia(1, 10), pontoDoDia(2, 11)];
    });
    await renderizar(<DetalheAtivo />);
    expect(await screen.findByText('painel com 2 candles')).toBeOnTheScreen();
  });

  it('1D explica que é um único ponto e não desenha candles', async () => {
    const user = userEvent.setup();
    jest.mocked(ativosApi.historico).mockImplementation(async (_id: string, periodo: string) =>
      periodo === '1D' ? [pontoDoDia(3, 12)] : [pontoDoDia(1, 10), pontoDoDia(2, 11)],
    );
    await renderizar(<DetalheAtivo />);
    await screen.findByText('painel com 2 candles');
    await user.press(screen.getByRole('radio', { name: '1D' }));
    expect(await screen.findByText(/1D mostra só a cotação atual/)).toBeOnTheScreen();
    expect(screen.queryByText(/painel com/)).not.toBeOnTheScreen();
  });

  it('histórico com um único dia não desenha e explica', async () => {
    jest.mocked(ativosApi.historico).mockResolvedValue([pontoDoDia(1, 10)]);
    await renderizar(<DetalheAtivo />);
    expect(await screen.findByText('Dados insuficientes para o gráfico neste período.')).toBeOnTheScreen();
  });

  it('erro do histórico mostra a mensagem do erro', async () => {
    jest.mocked(ativosApi.historico).mockRejectedValue(new ApiError(404, 'Historico nao encontrado'));
    await renderizar(<DetalheAtivo />);
    expect(await screen.findByText('Histórico indisponível para este ativo.')).toBeOnTheScreen();
  });
});
