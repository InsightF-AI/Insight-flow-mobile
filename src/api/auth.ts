import { request } from '@/api/client';
import type {
  AlterarSenhaRequest,
  CadastroRequest,
  LoginRequest,
  RecuperarSenhaRequest,
  RedefinirSenhaRequest,
  RefreshRequest,
  TokenResponse,
} from '@/api/tipos';

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
  /** Responde 202 mesmo para e-mail desconhecido: o app nunca revela se a conta existe. */
  recuperarSenha: (email: string) =>
    request<void>('/auth/recuperar-senha', { metodo: 'POST', corpo: { email } satisfies RecuperarSenhaRequest }),
  redefinirSenha: (token: string, novaSenha: string) =>
    request<void>('/auth/redefinir-senha', {
      metodo: 'POST',
      corpo: { token, nova_senha: novaSenha } satisfies RedefinirSenhaRequest,
    }),
  /** Revoga todos os refresh tokens da conta: depois de trocar, a sessão deste aparelho precisa de novo login. */
  alterarSenha: (senhaAtual: string, novaSenha: string) =>
    request<void>('/usuarios/me/senha', {
      metodo: 'PUT',
      corpo: { senha_atual: senhaAtual, nova_senha: novaSenha } satisfies AlterarSenhaRequest,
    }),
};
