import { ApiError } from '@/api/client';

export function ehStatus(erro: unknown, status: number): boolean {
  return erro instanceof ApiError && erro.status === status;
}

export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ApiError) {
    if (erro.status === 503) return 'Fonte de dados de mercado indisponível. Tente novamente em instantes.';
    return erro.message;
  }
  return 'Algo deu errado. Tente novamente.';
}
