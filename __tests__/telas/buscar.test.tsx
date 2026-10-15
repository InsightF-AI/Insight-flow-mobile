import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { ativosApi } from '@/api/ativos';
import { ApiError } from '@/api/client';
import { watchlistApi } from '@/api/watchlist';
import { renderizar } from '@/test/renderizar';

import Buscar from '../../app/buscar';

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock('@/api/ativos', () => ({ ativosApi: { buscar: jest.fn() } }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn(), adicionar: jest.fn() } }));

const petr = { ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO' as const, moeda: 'BRL', setor: 'Petróleo' };
// O termo só é buscado 400 ms depois da última tecla (debounce); sob carga o findBy padrão (1 s) estoura.
const TEMPO_DA_BUSCA_MS = 5000;

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
});

/** Confirma o diálogo "Adicionar à watchlist" tocando no botão de ação. */
function confirmarAdicao() {
  jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensagem, botoes) => {
    botoes?.find((botao) => botao.text === 'Adicionar')?.onPress?.();
  });
}

it('pede ao menos 2 caracteres antes de buscar', async () => {
  await renderizar(<Buscar />);
  expect(screen.getByText('Digite ao menos 2 caracteres do ticker ou do nome.')).toBeOnTheScreen();
  expect(ativosApi.buscar).not.toHaveBeenCalled();
});

it('a linha diz ao leitor de tela se o ativo já está na watchlist ou o que o toque faz', async () => {
  jest.mocked(ativosApi.buscar).mockResolvedValue([petr, { ...petr, ticker: 'VALE3', nome: 'Vale ON' }]);
  jest.mocked(watchlistApi.listar).mockResolvedValue([
    {
      ativo: { id: 'a-2', ticker: 'VALE3', nome: 'Vale ON', tipo: 'ACAO', setor: null, moeda: 'BRL' },
      notificar: true,
      adicionado_em: '2026-09-25T12:00:00Z',
    },
  ]);
  const user = userEvent.setup();
  await renderizar(<Buscar />);
  await user.type(screen.getByLabelText('Ticker ou nome'), 'a3');
  const fora = await screen.findByRole('button', { name: 'PETR4, Petrobras PN' }, { timeout: TEMPO_DA_BUSCA_MS });
  const dentro = await screen.findByRole('button', { name: 'VALE3, Vale ON' }, { timeout: TEMPO_DA_BUSCA_MS });

  await waitFor(() => expect(dentro.props.accessibilityHint).toBe('Já está na sua watchlist. Toque para abrir o ativo.'));
  expect(fora.props.accessibilityHint).toBe('Toque para adicionar à watchlist.');
});

it('confirmar a adição inclui o ativo na watchlist e abre o detalhe', async () => {
  const user = userEvent.setup();
  confirmarAdicao();
  jest.mocked(ativosApi.buscar).mockResolvedValue([petr]);
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  jest.mocked(watchlistApi.adicionar).mockResolvedValue({
    ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: 'Petróleo', moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-09-25T12:00:00Z',
  });
  await renderizar(<Buscar />);
  await user.type(screen.getByLabelText('Ticker ou nome'), 'PETR');
  await user.press(await screen.findByRole('button', { name: 'PETR4, Petrobras PN' }, { timeout: TEMPO_DA_BUSCA_MS }));
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1', ticker: 'PETR4' } }),
  );
  expect(ativosApi.buscar).toHaveBeenLastCalledWith('PETR');
  expect(watchlistApi.adicionar).toHaveBeenCalledWith('PETR4');
});

it('fonte de dados fora do ar mostra erro amigável', async () => {
  const user = userEvent.setup();
  jest.mocked(ativosApi.buscar).mockRejectedValue(new ApiError(503, 'Fonte de dados de mercado indisponivel'));
  await renderizar(<Buscar />);
  await user.type(screen.getByLabelText('Ticker ou nome'), 'VALE');
  expect(await screen.findByRole('alert', undefined, { timeout: TEMPO_DA_BUSCA_MS })).toHaveTextContent(
    'Fonte de dados de mercado indisponível. Tente novamente em instantes.',
  );
});

const itemDaWatchlist = {
  ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO' as const, setor: 'Petróleo', moeda: 'BRL' },
  notificar: true,
  adicionado_em: '2026-09-25T12:00:00Z',
};

it('toque duplo no mesmo resultado adiciona e navega uma única vez', async () => {
  const user = userEvent.setup();
  confirmarAdicao();
  let concluirAdicao: (item: typeof itemDaWatchlist) => void = () => {};
  jest.mocked(ativosApi.buscar).mockResolvedValue([petr]);
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  jest.mocked(watchlistApi.adicionar).mockImplementation(
    () => new Promise((resolver) => (concluirAdicao = resolver)),
  );
  await renderizar(<Buscar />);
  await user.type(screen.getByLabelText('Ticker ou nome'), 'PETR');
  const resultado = await screen.findByRole('button', { name: 'PETR4, Petrobras PN' }, { timeout: TEMPO_DA_BUSCA_MS });
  await user.press(resultado);
  await waitFor(() => expect(watchlistApi.adicionar).toHaveBeenCalledTimes(1));
  await screen.findByText('Adicionando à watchlist…');
  await user.press(screen.getByRole('button', { name: 'PETR4, Petrobras PN' }));
  expect(watchlistApi.adicionar).toHaveBeenCalledTimes(1);
  concluirAdicao(itemDaWatchlist);
  await waitFor(() => expect(router.replace).toHaveBeenCalledTimes(1));
  expect(watchlistApi.adicionar).toHaveBeenCalledTimes(1);
});

it('o erro da tentativa anterior some ao digitar um novo termo', async () => {
  const user = userEvent.setup();
  confirmarAdicao();
  jest.mocked(ativosApi.buscar).mockResolvedValue([petr]);
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  jest.mocked(watchlistApi.adicionar).mockRejectedValue(new ApiError(503, 'Fonte de dados de mercado indisponivel'));
  await renderizar(<Buscar />);
  await user.type(screen.getByLabelText('Ticker ou nome'), 'PETR');
  await user.press(await screen.findByRole('button', { name: 'PETR4, Petrobras PN' }, { timeout: TEMPO_DA_BUSCA_MS }));
  expect(await screen.findByRole('alert')).toBeOnTheScreen();
  await user.type(screen.getByLabelText('Ticker ou nome'), '4');
  expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
});

it('pede confirmação antes de adicionar e não adiciona se o usuário cancelar', async () => {
  const user = userEvent.setup();
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(ativosApi.buscar).mockResolvedValue([petr]);
  await renderizar(<Buscar />);
  await user.type(screen.getByLabelText('Ticker ou nome'), 'PETR');
  await user.press(await screen.findByRole('button', { name: 'PETR4, Petrobras PN' }, { timeout: TEMPO_DA_BUSCA_MS }));
  expect(alerta).toHaveBeenCalledWith(
    'Adicionar à watchlist',
    expect.stringContaining('PETR4'),
    expect.arrayContaining([expect.objectContaining({ text: 'Adicionar' })]),
  );
  expect(watchlistApi.adicionar).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});

it('ativo que já está na watchlist abre direto, sem diálogo nem nova adição', async () => {
  const user = userEvent.setup();
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(ativosApi.buscar).mockResolvedValue([petr]);
  jest.mocked(watchlistApi.listar).mockResolvedValue([itemDaWatchlist]);
  await renderizar(<Buscar />);
  await user.type(screen.getByLabelText('Ticker ou nome'), 'PETR');
  expect(await screen.findByText('Na watchlist', undefined, { timeout: TEMPO_DA_BUSCA_MS })).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'PETR4, Petrobras PN' }));
  expect(alerta).not.toHaveBeenCalled();
  expect(watchlistApi.adicionar).not.toHaveBeenCalled();
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/ativo/[id]', params: { id: 'a-1', ticker: 'PETR4' } });
});
