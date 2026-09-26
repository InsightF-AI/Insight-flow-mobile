import { useMutation } from '@tanstack/react-query';

import { authApi } from '@/api/auth';
import type { ApiError } from '@/api/client';
import type { CadastroRequest, LoginRequest, TokenResponse } from '@/api/tipos';

export function useLogin() {
  return useMutation<TokenResponse, ApiError, LoginRequest>({ mutationFn: (dados) => authApi.login(dados) });
}

export function useCadastro() {
  return useMutation<TokenResponse, ApiError, CadastroRequest>({ mutationFn: (dados) => authApi.cadastrar(dados) });
}
