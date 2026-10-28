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

export function useRecuperarSenha() {
  return useMutation<void, ApiError, string>({ mutationFn: (email) => authApi.recuperarSenha(email) });
}

export function useRedefinirSenha() {
  return useMutation<void, ApiError, { token: string; novaSenha: string }>({
    mutationFn: ({ token, novaSenha }) => authApi.redefinirSenha(token, novaSenha),
  });
}

export function useAlterarSenha() {
  return useMutation<void, ApiError, { senhaAtual: string; novaSenha: string }>({
    mutationFn: ({ senhaAtual, novaSenha }) => authApi.alterarSenha(senhaAtual, novaSenha),
  });
}
