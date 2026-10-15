import { ApiError } from '@/api/client';
import type { ItemWatchlist } from '@/api/tipos';
import { resolverAtivoId } from '@/dominio/resolverAtivoId';

function item(id: string, ticker: string): ItemWatchlist {
  return {
    ativo: { id, ticker, nome: ticker, tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-09-25T12:00:00Z',
  };
}

function criarDeps() {
  return {
    listarWatchlist: jest.fn<Promise<ItemWatchlist[]>, []>(),
    adicionarWatchlist: jest.fn<Promise<ItemWatchlist>, [string]>(),
  };
}

it('usa o ativo que já está na watchlist, ignorando caixa e espaços', async () => {
  const deps = criarDeps();
  deps.listarWatchlist.mockResolvedValue([item('a-1', 'PETR4')]);
  await expect(resolverAtivoId('  petr4 ', deps)).resolves.toEqual({ ativoId: 'a-1', adicionouNaWatchlist: false });
  expect(deps.adicionarWatchlist).not.toHaveBeenCalled();
});

it('adiciona à watchlist quando o ativo ainda não está lá', async () => {
  const deps = criarDeps();
  deps.listarWatchlist.mockResolvedValue([item('a-1', 'PETR4')]);
  deps.adicionarWatchlist.mockResolvedValue(item('a-2', 'VALE3'));
  await expect(resolverAtivoId('vale3', deps)).resolves.toEqual({ ativoId: 'a-2', adicionouNaWatchlist: true });
  expect(deps.adicionarWatchlist).toHaveBeenCalledWith('VALE3');
});

it('409 na adição (corrida) busca de novo e usa o item existente', async () => {
  const deps = criarDeps();
  deps.listarWatchlist.mockResolvedValueOnce([]).mockResolvedValueOnce([item('a-3', 'ITUB4')]);
  deps.adicionarWatchlist.mockRejectedValue(new ApiError(409, 'Ativo ja esta na watchlist'));
  await expect(resolverAtivoId('ITUB4', deps)).resolves.toEqual({ ativoId: 'a-3', adicionouNaWatchlist: false });
  expect(deps.listarWatchlist).toHaveBeenCalledTimes(2);
});

it('409 sem o item na nova busca vira erro', async () => {
  const deps = criarDeps();
  deps.listarWatchlist.mockResolvedValue([]);
  deps.adicionarWatchlist.mockRejectedValue(new ApiError(409, 'Ativo ja esta na watchlist'));
  await expect(resolverAtivoId('ITUB4', deps)).rejects.toMatchObject({ status: 409 });
});

it('404 na adição propaga o erro', async () => {
  const deps = criarDeps();
  deps.listarWatchlist.mockResolvedValue([]);
  deps.adicionarWatchlist.mockRejectedValue(new ApiError(404, 'Ativo nao encontrado'));
  await expect(resolverAtivoId('XPTO3', deps)).rejects.toMatchObject({ status: 404 });
});

it('ticker vazio é rejeitado sem chamar a API', async () => {
  const deps = criarDeps();
  await expect(resolverAtivoId('   ', deps)).rejects.toThrow('Ticker vazio');
  expect(deps.listarWatchlist).not.toHaveBeenCalled();
});
