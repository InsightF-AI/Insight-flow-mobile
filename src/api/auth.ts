import { request } from '@/api/client';
import type { CadastroRequest, LoginRequest, TokenResponse } from '@/api/tipos';

export const authApi = {
  login: (dados: LoginRequest) => request<TokenResponse>('/auth/login', { metodo: 'POST', corpo: dados }),
  cadastrar: (dados: CadastroRequest) => request<TokenResponse>('/usuarios', { metodo: 'POST', corpo: dados }),
};
