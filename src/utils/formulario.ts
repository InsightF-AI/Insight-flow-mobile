import type { RefObject } from 'react';

interface Focavel {
  focus: () => void;
}

/**
 * Leva o foco ao primeiro campo com erro, na ordem em que aparecem na tela. O leitor de tela então lê o rótulo e o
 * erro do campo (a dica do `Campo`), e quem digita já cai onde precisa corrigir.
 */
export function focarPrimeiroComErro<C extends string>(
  erros: Partial<Record<C, string | undefined>>,
  campos: readonly (readonly [C, RefObject<Focavel | null>])[],
): void {
  const primeiro = campos.find(([chave]) => Boolean(erros[chave]));
  primeiro?.[1].current?.focus();
}
