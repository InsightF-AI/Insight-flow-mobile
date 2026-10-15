import { request } from '@/api/client';
import type { CadastroRequest, LoginRequest, RefreshRequest, TokenResponse } from '@/api/tipos';

export const authApi = {
  login: (dados: LoginRequest) => request<TokenResponse>('/auth/login', { metodo: 'POST', corpo: dados }),
  cadastrar: (dados: CadastroRequest) => request<TokenResponse>('/usuarios', { metodo: 'POST', corpo: dados }),
  renovar: (refreshToken: string) =>
    request<TokenResponse>('/auth/refresh', {
      metodo: 'POST',
      corpo: { refresh_token: refreshToken } satisfies RefreshRequest,
    }),
  sair: (refreshToken: string) =>
    request<void>('/auth/logout', { metodo: 'POST', corpo: { refresh_token: refreshToken } satisfies RefreshRequest }),
};
