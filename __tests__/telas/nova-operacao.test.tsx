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

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
// O seletor de data é nativo; a data padrão (hoje) é suficiente para estes testes.
jest.mock('@/components/CampoData', () => ({ CampoData: () => null }));
jest.mock('@/api/watchlist', () => ({ watchlistApi: { listar: jest.fn(), adicionar: jest.fn() } }));
jest.mock('@/api/portfolio', () => ({ portfolioApi: { registrarOperacao: jest.fn(), listarOperacoes: jest.fn() } }));
jest.mock('@/api/ativos', () => ({ ativosApi: { cotacao: jest.fn(), catalogo: jest.fn() } }));

const NBSP = ' ';

function item(id: string, ticker: string): ItemWatchlist {
  return {
    ativo: { id, ticker, nome: ticker, tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-09-25T12:00:00Z',
  };
}

function compra(id: string, ativoId: string, quantidade: string): Operacao {
  return {
    id,
    ativo_id: ativoId,
    tipo: 'COMPRA',
    quantidade,
    preco_unitario: '30',
    data: '2026-09-01',
    criado_em: '2026-09-01T12:00:00Z',
  };
}

async function abrir() {
  await renderizar(<NovaOperacao />);
  await screen.findByRole('button', { name: 'Registrar operação' });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(watchlistApi.listar).mockResolvedValue([item('a-1', 'PETR4')]);
  jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([]);
  jest.mocked(ativosApi.catalogo).mockResolvedValue([]);
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

it('mostra o aviso de operação simulada', async () => {
  await abrir();
  expect(screen.getByText(/nenhuma ordem real é enviada/)).toBeOnTheScreen();
});

it('sem watchlist e sem catálogo leva à busca em vez de deixar digitar qualquer ativo', async () => {
  const user = userEvent.setup();
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  await renderizar(<NovaOperacao />);
  expect(await screen.findByText(/Nenhum ativo disponível para operar/)).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Registrar operação' })).not.toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Buscar ativo' }));
  expect(router.push).toHaveBeenCalledWith('/buscar');
});

it('usuário novo sem watchlist registra um ativo do catálogo sem adicioná-lo à watchlist', async () => {
  const user = userEvent.setup();
  jest.mocked(watchlistApi.listar).mockResolvedValue([]);
  jest.mocked(ativosApi.catalogo).mockResolvedValue([
    { id: 'c-9', ticker: 'BTC', nome: 'Bitcoin', tipo: 'CRIPTO', setor: null, moeda: 'BRL' },
  ]);
  jest.mocked(portfolioApi.registrarOperacao).mockResolvedValue({ id: 'o-3' } as Operacao);
  await abrir();
  await user.press(screen.getByRole('button', { name: 'Usar BTC' }));
  await user.type(screen.getByLabelText('Quantidade'), '0,5');
  await user.type(screen.getByLabelText('Preço unitário'), '416915');
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
  await waitFor(() => expect(router.back).toHaveBeenCalled());
  expect(ativosApi.cotacao).toHaveBeenCalledWith('c-9');
  expect(watchlistApi.adicionar).not.toHaveBeenCalled();
  expect(portfolioApi.registrarOperacao).toHaveBeenCalledWith(expect.objectContaining({ ativo_id: 'c-9', quantidade: '0.5' }));
});

it('catálogo fora do ar não impede operar com a watchlist', async () => {
  jest.mocked(ativosApi.catalogo).mockRejectedValue(new ApiError(503, 'Fonte indisponivel'));
  await abrir();
  expect(screen.getByRole('button', { name: 'Usar PETR4' })).toBeOnTheScreen();
});

it('valida os campos antes de enviar', async () => {
  const user = userEvent.setup();
  await abrir();
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
  expect(await screen.findByText('Informe o ticker do ativo')).toBeOnTheScreen();
  expect(portfolioApi.registrarOperacao).not.toHaveBeenCalled();
});

it('ticker fora da watchlist e do catálogo é recusado e nada é adicionado em silêncio', async () => {
  const user = userEvent.setup();
  await abrir();
  await user.type(screen.getByLabelText('Ativo (ticker)'), 'vale3');
  await user.type(screen.getByLabelText('Quantidade'), '10');
  await user.type(screen.getByLabelText('Preço unitário'), '61,4');
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
  expect(await screen.findByText('Escolha um ativo da lista')).toBeOnTheScreen();
  expect(watchlistApi.adicionar).not.toHaveBeenCalled();
  expect(portfolioApi.registrarOperacao).not.toHaveBeenCalled();
});

it('trocar de Venda para Compra apaga o erro de quantidade da venda', async () => {
  const user = userEvent.setup();
  await abrir();
  await user.press(screen.getByRole('radio', { name: 'Venda' }));
  await user.type(screen.getByLabelText('Ativo (ticker)'), 'PETR4');
  await user.type(screen.getByLabelText('Quantidade'), '5');
  await user.type(screen.getByLabelText('Preço unitário'), '38');
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
  expect(await screen.findByText('Sem posição em carteira neste ativo')).toBeOnTheScreen();

  await user.press(screen.getByRole('radio', { name: 'Compra' }));

  expect(screen.queryByText('Sem posição em carteira neste ativo')).not.toBeOnTheScreen();
});

it('registra com o ativo da watchlist, ticker normalizado e decimais convertidos', async () => {
  const user = userEvent.setup();
  jest.mocked(portfolioApi.registrarOperacao).mockResolvedValue({ id: 'o-2' } as Operacao);
  await abrir();
  await user.type(screen.getByLabelText('Ativo (ticker)'), '  petr4 ');
  await user.type(screen.getByLabelText('Quantidade'), '10,5');
  await user.type(screen.getByLabelText('Preço unitário'), '38,2');
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
  await waitFor(() => expect(router.back).toHaveBeenCalled());
  expect(watchlistApi.adicionar).not.toHaveBeenCalled();
  expect(portfolioApi.registrarOperacao).toHaveBeenCalledWith({
    ativo_id: 'a-1',
    tipo: 'COMPRA',
    quantidade: '10.5',
    preco_unitario: '38.2',
    data: dataParaISOLocal(new Date()),
  });
});

it('atalho da watchlist e "usar cotação atual" preenchem ticker e preço', async () => {
  const user = userEvent.setup();
  await abrir();
  await user.press(await screen.findByRole('button', { name: 'Usar PETR4' }));
  await user.press(await screen.findByRole('button', { name: `Usar cotação atual (R$${NBSP}38,20)` }));
  expect(screen.getByLabelText('Ativo (ticker)')).toHaveDisplayValue('PETR4');
  expect(screen.getByLabelText('Preço unitário')).toHaveDisplayValue('38,2');
});

describe('venda', () => {
  it('mostra a quantidade disponível a partir das operações', async () => {
    const user = userEvent.setup();
    jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([compra('o-1', 'a-1', '10'), compra('o-2', 'a-1', '5')]);
    await abrir();
    await user.press(screen.getByRole('radio', { name: 'Venda' }));
    await user.press(await screen.findByRole('button', { name: 'Usar PETR4' }));
    expect(await screen.findByText('Disponível para venda: 15')).toBeOnTheScreen();
  });

  it('venda maior que o disponível hoje é recusada sem ir ao servidor', async () => {
    const user = userEvent.setup();
    jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([compra('o-1', 'a-1', '10')]);
    await abrir();
    await user.press(screen.getByRole('radio', { name: 'Venda' }));
    await user.press(await screen.findByRole('button', { name: 'Usar PETR4' }));
    await screen.findByText('Disponível para venda: 10');
    await user.type(screen.getByLabelText('Quantidade'), '11');
    await user.type(screen.getByLabelText('Preço unitário'), '38');
    await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
    expect(await screen.findByText('Maior que a quantidade disponível (10)')).toBeOnTheScreen();
    expect(portfolioApi.registrarOperacao).not.toHaveBeenCalled();
  });

  it('ativo sem posição diz isso', async () => {
    const user = userEvent.setup();
    await abrir();
    await user.press(screen.getByRole('radio', { name: 'Venda' }));
    await user.press(await screen.findByRole('button', { name: 'Usar PETR4' }));
    expect(await screen.findByText('Sem posição em carteira neste ativo.')).toBeOnTheScreen();
  });

  it('operações ainda não carregadas não bloqueiam a venda (o servidor decide)', async () => {
    const user = userEvent.setup();
    jest.mocked(portfolioApi.listarOperacoes).mockRejectedValue(new ApiError(500, 'Falha no servidor'));
    jest.mocked(portfolioApi.registrarOperacao).mockResolvedValue({ id: 'o-3' } as Operacao);
    await abrir();
    await user.press(screen.getByRole('radio', { name: 'Venda' }));
    await user.type(screen.getByLabelText('Ativo (ticker)'), 'PETR4');
    await user.type(screen.getByLabelText('Quantidade'), '500');
    await user.type(screen.getByLabelText('Preço unitário'), '38');
    await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
    await waitFor(() => expect(portfolioApi.registrarOperacao).toHaveBeenCalledTimes(1));
  });
});

describe('erros 422 do backend em português', () => {
  it('venda sem saldo mostra frase legível em vez do UUID', async () => {
    const user = userEvent.setup();
    // Hoje há 10 em carteira (o app deixa passar 5); o servidor recusa por outra venda posterior ficar sem saldo.
    jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([compra('o-1', 'a-1', '10')]);
    jest
      .mocked(portfolioApi.registrarOperacao)
      .mockRejectedValue(new ApiError(422, '3fa85f64-5717-4562-b3fc-2c963f66afa6'));
    await abrir();
    await user.press(screen.getByRole('radio', { name: 'Venda' }));
    await user.type(screen.getByLabelText('Ativo (ticker)'), 'PETR4');
    await screen.findByText('Disponível para venda: 10');
    await user.type(screen.getByLabelText('Quantidade'), '5');
    await user.type(screen.getByLabelText('Preço unitário'), '38');
    await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(
      'Quantidade insuficiente em carteira: a venda deixaria o saldo negativo na data informada ou em uma venda posterior.',
    );
    expect(alerta).not.toHaveTextContent('3fa85f64');
    expect(router.back).not.toHaveBeenCalled();
  });

  it('"data nao pode ser futura" vira frase em português', async () => {
    const user = userEvent.setup();
    jest.mocked(portfolioApi.registrarOperacao).mockRejectedValue(new ApiError(422, 'data nao pode ser futura'));
    await abrir();
    await user.type(screen.getByLabelText('Ativo (ticker)'), 'PETR4');
    await user.type(screen.getByLabelText('Quantidade'), '1');
    await user.type(screen.getByLabelText('Preço unitário'), '38');
    await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A data da operação não pode ser futura');
  });
});

it('submit inválido depois de um erro geral da API remove a mensagem geral e mostra só os erros de campo', async () => {
  const user = userEvent.setup();
  jest.mocked(portfolioApi.registrarOperacao).mockRejectedValue(new ApiError(500, 'Falha no servidor'));
  await abrir();
  await user.type(screen.getByLabelText('Ativo (ticker)'), 'PETR4');
  await user.type(screen.getByLabelText('Quantidade'), '5');
  await user.type(screen.getByLabelText('Preço unitário'), '38');
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
  expect(await screen.findByText('Erro no servidor. Tente novamente em instantes.')).toBeOnTheScreen();

  await user.clear(screen.getByLabelText('Ativo (ticker)'));
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));

  expect(await screen.findByText('Informe o ticker do ativo')).toBeOnTheScreen();
  expect(screen.queryByText('Erro no servidor. Tente novamente em instantes.')).not.toBeOnTheScreen();
});

it('saldo de 0,1 + 0,2 − 0,3 é "sem posição", não "Disponível para venda: 0"', async () => {
  const user = userEvent.setup();
  jest.mocked(portfolioApi.listarOperacoes).mockResolvedValue([
    compra('o-1', 'a-1', '0.1'),
    compra('o-2', 'a-1', '0.2'),
    { ...compra('o-3', 'a-1', '0.3'), tipo: 'VENDA' },
  ]);
  await abrir();
  await user.press(screen.getByRole('radio', { name: 'Venda' }));
  await user.press(await screen.findByRole('button', { name: 'Usar PETR4' }));
  expect(await screen.findByText('Sem posição em carteira neste ativo.')).toBeOnTheScreen();
  expect(screen.queryByText(/Disponível para venda/)).not.toBeOnTheScreen();
});

it('quantidade com mais de 6 casas decimais é recusada: o servidor arredondaria em silêncio', async () => {
  const user = userEvent.setup();
  await abrir();
  await user.type(screen.getByLabelText('Ativo (ticker)'), 'PETR4');
  await user.type(screen.getByLabelText('Quantidade'), '0,0000001');
  await user.type(screen.getByLabelText('Preço unitário'), '38');
  await user.press(screen.getByRole('button', { name: 'Registrar operação' }));
  expect(await screen.findByText('Use no máximo 6 casas decimais')).toBeOnTheScreen();
  expect(portfolioApi.registrarOperacao).not.toHaveBeenCalled();
});
