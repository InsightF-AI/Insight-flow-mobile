import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ativosApi } from '@/api/ativos';
import { ApiError } from '@/api/client';
import { portfolioApi } from '@/api/portfolio';
import type { ItemWatchlist, Operacao } from '@/api/tipos';
import { watchlistApi } from '@/api/watchlist';
import { renderizar } from '@/test/renderizar';
import { dataParaISOLocal } from '@/utils/formatacao';

import NovaOperacao from '../../app/operacao/nova';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
// O seletor de data é nativo; a data padrão (hoje) é suficiente para estes testes.
jest.mock('@/components/CampoData', () => ({ CampoData: () => null }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn(), adicionar: jest.fn() } }));
jest.mock('@/api/portfolio', () => ({ portfolioApi: { registrarOperacao: jest.fn() } }));
jest.mock('@/api/ativos', () => ({ ativosApi: { cotacao: jest.fn() } }));

const NBSP = ' ';

function item(id: string, ticker: string): ItemWatchlist {
  return {
    ativo: { id, ticker, nome: ticker, tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-09-25T12:00:00Z',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(watchlistApi.listar).mockResolvedValue([item('a-1', 'PETR4')]);
  jest.mocked(ativosApi.cotacao).mockResolvedValue({
    ticker: 'PETR4',
    preco: '38.2',
    variacao: '0',
    variacao_percentual: '0',
    maxima_dia: '39',
    minima_dia: '38',
    volume: '1000',
  });
});

it('valida os campos antes de enviar', async () => {
  const user = userEvent.setup();
  await renderizar(<NovaOperacao />);
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
  expect(await screen.findByText('Informe o ticker do ativo')).toBeOnTheScreen();
  expect(portfolioApi.registrarOperacao).not.toHaveBeenCalled();
});

it('ativo fora da watchlist é adicionado e a operação vai com decimais normalizados', async () => {
  const user = userEvent.setup();
  jest.mocked(watchlistApi.adicionar).mockResolvedValue(item('a-2', 'VALE3'));
  jest.mocked(portfolioApi.registrarOperacao).mockResolvedValue({ id: 'o-1' } as Operacao);
  await renderizar(<NovaOperacao />);
  await user.type(screen.getByLabelText('Ativo (ticker)'), 'vale3');
  await user.type(screen.getByLabelText('Quantidade'), '10,5');
  await user.type(screen.getByLabelText('Preço unitário'), '61,4');
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
  await waitFor(() => expect(router.back).toHaveBeenCalled());
  expect(watchlistApi.adicionar).toHaveBeenCalledWith('VALE3');
  expect(portfolioApi.registrarOperacao).toHaveBeenCalledWith({
    ativo_id: 'a-2',
    tipo: 'COMPRA',
    quantidade: '10.5',
    preco_unitario: '61.4',
    data: dataParaISOLocal(new Date()),
  });
});

it('ticker em minúsculas e com espaços reaproveita o item da watchlist em vez de adicionar de novo', async () => {
  const user = userEvent.setup();
  jest.mocked(portfolioApi.registrarOperacao).mockResolvedValue({ id: 'o-2' } as Operacao);
  await renderizar(<NovaOperacao />);
  await user.type(screen.getByLabelText('Ativo (ticker)'), '  petr4 ');
  await user.type(screen.getByLabelText('Quantidade'), '5');
  await user.type(screen.getByLabelText('Preço unitário'), '38,2');
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
  await waitFor(() => expect(router.back).toHaveBeenCalled());
  expect(watchlistApi.adicionar).not.toHaveBeenCalled();
  expect(portfolioApi.registrarOperacao).toHaveBeenCalledWith(expect.objectContaining({ ativo_id: 'a-1' }));
});

it('atalho da watchlist e "usar cotação atual" preenchem ticker e preço', async () => {
  const user = userEvent.setup();
  await renderizar(<NovaOperacao />);
  await user.press(await screen.findByRole('button', { name: 'Usar PETR4' }));
  await user.press(await screen.findByRole('button', { name: `Usar cotação atual (R$${NBSP}38,20)` }));
  expect(screen.getByLabelText('Ativo (ticker)')).toHaveDisplayValue('PETR4');
  expect(screen.getByLabelText('Preço unitário')).toHaveDisplayValue('38,2');
});

it('venda sem saldo mostra frase legível em vez do UUID do backend', async () => {
  const user = userEvent.setup();
  jest
    .mocked(portfolioApi.registrarOperacao)
    .mockRejectedValue(new ApiError(422, '3fa85f64-5717-4562-b3fc-2c963f66afa6'));
  await renderizar(<NovaOperacao />);
  await user.press(screen.getByRole('radio', { name: 'Venda' }));
  await user.type(screen.getByLabelText('Ativo (ticker)'), 'PETR4');
  await user.type(screen.getByLabelText('Quantidade'), '100');
  await user.type(screen.getByLabelText('Preço unitário'), '38');
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
  const alerta = await screen.findByRole('alert');
  expect(alerta).toHaveTextContent('Quantidade insuficiente em carteira para esta venda na data informada.');
  expect(alerta).not.toHaveTextContent('3fa85f64');
  expect(router.back).not.toHaveBeenCalled();
});
