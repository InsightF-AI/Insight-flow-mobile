import { fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';

import { alertasApi } from '@/api/alertas';
import { ativosApi } from '@/api/ativos';
import { ApiError } from '@/api/client';
import type { Alerta } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { renderizar } from '@/test/renderizar';

import Alertas from '../../app/(tabs)/alertas';

jest.mock('@/api/alertas', () => ({
  alertasApi: { listar: jest.fn(), criar: jest.fn(), atualizar: jest.fn(), remover: jest.fn() },
}));
jest.mock('@/api/ativos', () => ({
  ativosApi: { cotacao: jest.fn(), buscar: jest.fn(), sinais: jest.fn(), backtest: jest.fn() },
}));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn() } }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const alerta: Alerta = {
  id: 'al-1',
  ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: null, moeda: 'BRL' },
  tipo_condicao: 'PRECO_MAIOR_IGUAL',
  valor_alvo: '40',
  moeda_alvo: 'BRL',
  habilitado: true,
  ultimo_estado: false,
  disparado_em: null,
  criado_em: '2026-09-20T12:00:00Z',
  atualizado_em: '2026-09-20T12:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(alertasApi.listar).mockResolvedValue([]);
  jest.mocked(ativosApi.cotacao).mockResolvedValue({
    ticker: 'PETR4',
    preco: '38',
    variacao: '0',
    variacao_percentual: '0',
    maxima_dia: '38',
    minima_dia: '38',
    volume: '0',
  });
  jest.mocked(ativosApi.buscar).mockResolvedValue([]);
  jest.mocked(ativosApi.sinais).mockResolvedValue([]);
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
});

it('lista vazia mostra estado vazio', async () => {
  await renderizar(<Alertas />);
  expect(await screen.findByText('Nenhum alerta cadastrado.')).toBeOnTheScreen();
});

it('cria alerta com ticker normalizado e limpa o formulário', async () => {
  const user = userEvent.setup();
  jest.mocked(alertasApi.criar).mockResolvedValue(alerta);
  jest.mocked(alertasApi.listar).mockResolvedValueOnce([]).mockResolvedValue([alerta]);
  await renderizar(<Alertas />);
  await user.type(screen.getByLabelText('Ticker'), ' vale3');
  await user.press(screen.getByRole('radio', { name: 'Preço ≤' }));
  await user.type(screen.getByLabelText('Valor alvo'), '61,5');
  await user.press(screen.getByRole('button', { name: 'Criar alerta' }));
  await waitFor(() =>
    expect(alertasApi.criar).toHaveBeenCalledWith({ ticker: 'VALE3', tipo_condicao: 'PRECO_MENOR_IGUAL', valor_alvo: '61.5' }),
  );
  await waitFor(() => expect(screen.getByLabelText('Ticker')).toHaveDisplayValue(''));
  expect(await screen.findByText('PETR4')).toBeOnTheScreen();
});

it('ticker inexistente marca o campo', async () => {
  const user = userEvent.setup();
  jest.mocked(alertasApi.criar).mockRejectedValue(new ApiError(404, 'Ativo nao encontrado'));
  await renderizar(<Alertas />);
  await user.type(screen.getByLabelText('Ticker'), 'XPTO9');
  await user.type(screen.getByLabelText('Valor alvo'), '10');
  await user.press(screen.getByRole('button', { name: 'Criar alerta' }));
  expect(await screen.findByText('Ativo não encontrado')).toBeOnTheScreen();
});

it('alternar o switch desabilita o alerta no backend', async () => {
  jest.mocked(alertasApi.listar).mockResolvedValueOnce([alerta]).mockResolvedValue([{ ...alerta, habilitado: false }]);
  jest.mocked(alertasApi.atualizar).mockResolvedValue({ ...alerta, habilitado: false });
  await renderizar(<Alertas />);
  await fireEvent(await screen.findByRole('switch', { name: 'Alerta de PETR4 habilitado' }), 'valueChange', false);
  expect(alertasApi.atualizar).toHaveBeenCalledWith('al-1', { ativo: false });
  await waitFor(() => expect(screen.getByRole('switch', { name: 'Alerta de PETR4 habilitado' })).not.toBeChecked());
});

it('submit inválido depois de um erro geral da API remove a mensagem geral e mostra só os erros de campo', async () => {
  const user = userEvent.setup();
  jest.mocked(alertasApi.criar).mockRejectedValue(new ApiError(500, 'Falha no servidor'));
  await renderizar(<Alertas />);
  await user.type(screen.getByLabelText('Ticker'), 'PETR4');
  await user.type(screen.getByLabelText('Valor alvo'), '10');
  await user.press(screen.getByRole('button', { name: 'Criar alerta' }));
  expect(await screen.findByText('Erro no servidor. Tente novamente em instantes.')).toBeOnTheScreen();

  await user.clear(screen.getByLabelText('Ticker'));
  await user.press(screen.getByRole('button', { name: 'Criar alerta' }));

  expect(await screen.findByText('Informe o ticker do ativo')).toBeOnTheScreen();
  expect(screen.queryByText('Erro no servidor. Tente novamente em instantes.')).not.toBeOnTheScreen();
});
it('mostra o preço atual e a distância ao alvo de cada alerta', async () => {
  jest.mocked(alertasApi.listar).mockResolvedValue([alerta]);
  await renderizar(<Alertas />);
  expect(await screen.findByText('Faltam 5,26% para o alvo')).toBeOnTheScreen();
});

it('sugere tickers da busca enquanto o usuário digita e preenche o campo ao tocar', async () => {
  const user = userEvent.setup();
  jest.mocked(ativosApi.buscar).mockResolvedValue([
    { ticker: 'VALE3', nome: 'Vale ON', tipo: 'ACAO', moeda: 'BRL', setor: null },
    { ticker: 'VALE5', nome: 'Vale PNA', tipo: 'ACAO', moeda: 'BRL', setor: null },
  ]);
  await renderizar(<Alertas />);
  await user.type(screen.getByLabelText('Ticker'), 'VAL');
  await user.press(await screen.findByRole('button', { name: 'Usar VALE3' }, { timeout: 5000 }));
  expect(screen.getByLabelText('Ticker')).toHaveDisplayValue('VALE3');
});

describe('segmento Sinais', () => {
  const itemWatchlist = {
    ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO' as const, setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-10-01T12:00:00Z',
  };

  it('lista os sinais ativos da watchlist com o histórico da condição', async () => {
    const user = userEvent.setup();
    jest.mocked(watchlistApi.listar).mockResolvedValue([itemWatchlist]);
    jest.mocked(ativosApi.sinais).mockResolvedValue([
      {
        id: 's-1',
        ativo_id: 'a-1',
        regra_id: 'a1a1a1a1-0000-0000-0000-000000000001',
        regra_nome: 'Sobrevenda RSI',
        regra_descricao: 'RSI(14) abaixo de 30.',
        data_ativacao: '2026-10-09T13:00:00Z',
        contexto: { valor: '28.4' },
        data_desativacao: null,
      },
    ]);
    jest.mocked(ativosApi.backtest).mockResolvedValue({
      regra_id: 'a1a1a1a1-0000-0000-0000-000000000001',
      ativo_id: 'a-1',
      total_ocorrencias: 4,
      retorno_medio_5_pregoes: '1.2',
      retorno_medio_20_pregoes: null,
      retorno_medio_60_pregoes: '-3',
    });
    await renderizar(<Alertas />);
    await user.press(screen.getByRole('radio', { name: 'Sinais' }));
    expect(await screen.findByText('Sobrevenda RSI')).toBeOnTheScreen();
    expect(screen.getByText('PETR4')).toBeOnTheScreen();
    expect(await screen.findByText('+1,20%')).toBeOnTheScreen();
  });

  it('sem sinais ativos explica em vez de mostrar uma lista vazia', async () => {
    const user = userEvent.setup();
    jest.mocked(watchlistApi.listar).mockResolvedValue([itemWatchlist]);
    await renderizar(<Alertas />);
    await user.press(screen.getByRole('radio', { name: 'Sinais' }));
    expect(await screen.findByText('Nenhum sinal técnico ativo no momento.')).toBeOnTheScreen();
  });

  it('watchlist vazia diz que não há ativos para acompanhar', async () => {
    const user = userEvent.setup();
    await renderizar(<Alertas />);
    await user.press(screen.getByRole('radio', { name: 'Sinais' }));
    expect(await screen.findByText('Sua watchlist está vazia.')).toBeOnTheScreen();
  });
});
