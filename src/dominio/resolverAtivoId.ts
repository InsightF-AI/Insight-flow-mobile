import { ApiError } from '@/api/client';
import type { ItemWatchlist, Uuid } from '@/api/tipos';

export interface DepsResolverAtivo {
  listarWatchlist: () => Promise<ItemWatchlist[]>;
  adicionarWatchlist: (ticker: string) => Promise<ItemWatchlist>;
}

export interface AtivoResolvido {
  ativoId: Uuid;
  adicionouNaWatchlist: boolean;
}

/**
 * POST /operacoes exige ativo_id, que só existe para ativos já persistidos.
 * A watchlist é o único caminho da API para persistir um ativo a partir do ticker.
 */
export async function resolverAtivoId(ticker: string, deps: DepsResolverAtivo): Promise<AtivoResolvido> {
  const alvo = ticker.trim().toUpperCase();
  if (!alvo) throw new Error('Ticker vazio');

  const procurar = (itens: ItemWatchlist[]) => itens.find((item) => item.ativo.ticker.toUpperCase() === alvo);

  const existente = procurar(await deps.listarWatchlist());
  if (existente) return { ativoId: existente.ativo.id, adicionouNaWatchlist: false };

  try {
    const adicionado = await deps.adicionarWatchlist(alvo);
    return { ativoId: adicionado.ativo.id, adicionouNaWatchlist: true };
  } catch (erro) {
    if (!(erro instanceof ApiError) || erro.status !== 409) throw erro;
    const aposCorrida = procurar(await deps.listarWatchlist());
    if (aposCorrida) return { ativoId: aposCorrida.ativo.id, adicionouNaWatchlist: false };
    throw new ApiError(409, 'O ativo já está na watchlist, mas não foi encontrado. Tente novamente.');
  }
}
