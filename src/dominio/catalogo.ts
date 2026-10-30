import type { Ativo } from '@/api/tipos';

export function juntarAtivos(watchlist: Ativo[] | undefined, catalogo: Ativo[] | undefined): Ativo[] {
  const vistos = new Set<string>();
  const ativos: Ativo[] = [];
  for (const ativo of [...(watchlist ?? []), ...(catalogo ?? [])]) {
    const ticker = ativo.ticker.toUpperCase();
    if (vistos.has(ticker)) continue;
    vistos.add(ticker);
    ativos.push(ativo);
  }
  return ativos;
}

export function sugerirTickers(ativos: Ativo[], termo: string, limite: number): string[] {
  const normalizado = termo.trim().toUpperCase();
  if (!normalizado) return ativos.slice(0, limite).map((ativo) => ativo.ticker);
  if (ativos.some((ativo) => ativo.ticker.toUpperCase() === normalizado)) return [];
  return ativos
    .filter(
      (ativo) => ativo.ticker.toUpperCase().includes(normalizado) || ativo.nome.toUpperCase().includes(normalizado),
    )
    .slice(0, limite)
    .map((ativo) => ativo.ticker);
}
