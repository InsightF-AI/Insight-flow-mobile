import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { ativosApi } from '@/api/ativos';
import type { ApiError } from '@/api/client';
import type { Ativo, AtivoEncontrado } from '@/api/tipos';
import { chaves } from '@/hooks/chaves';

export const TAMANHO_MINIMO_BUSCA = 2;

export function useDebounce<T>(valor: T, atrasoMs: number): T {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const temporizador = setTimeout(() => setAtrasado(valor), atrasoMs);
    return () => clearTimeout(temporizador);
  }, [valor, atrasoMs]);
  return atrasado;
}

// O catálogo só muda quando alguém adiciona um ticker novo à watchlist.
const VALIDADE_CATALOGO_MS = 10 * 60_000;

export function useCatalogo() {
  return useQuery<Ativo[], ApiError>({
    queryKey: chaves.catalogo,
    queryFn: () => ativosApi.catalogo(),
    staleTime: VALIDADE_CATALOGO_MS,
  });
}

export function useBuscaAtivos(termo: string) {
  const normalizado = termo.trim();
  return useQuery<AtivoEncontrado[], ApiError>({
    queryKey: chaves.busca(normalizado),
    queryFn: () => ativosApi.buscar(normalizado),
    enabled: normalizado.length >= TAMANHO_MINIMO_BUSCA,
    staleTime: 5 * 60_000,
  });
}
