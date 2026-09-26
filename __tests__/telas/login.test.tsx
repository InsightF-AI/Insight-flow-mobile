import * as SecureStore from 'expo-secure-store';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { authApi } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useSessao } from '@/store/sessao';
import { renderizar } from '@/test/renderizar';

import Login from '../../app/(auth)/login';

jest.mock('expo-router', () => ({ Link: ({ children }: { children: ReactNode }) => children }));
jest.mock('@/api/auth', () => ({ authApi: { login: jest.fn(), cadastrar: jest.fn() } }));

const armazenamento = (SecureStore as unknown as { __armazenamento: Map<string, string> }).__armazenamento;

beforeEach(() => {
  jest.clearAllMocks();
  armazenamento.clear();
  useSessao.setState({ status: 'anonimo', token: null, email: null });
});

it('valida os campos antes de chamar a API', async () => {
  const user = userEvent.setup();
  await renderizar(<Login />);
  await user.press(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByText('Informe um e-mail válido')).toBeOnTheScreen();
  expect(screen.getByText('Informe a senha')).toBeOnTheScreen();
  expect(authApi.login).not.toHaveBeenCalled();
});

it('login com sucesso inicia a sessão com o e-mail sem espaços', async () => {
  const user = userEvent.setup();
  jest.mocked(authApi.login).mockResolvedValue({ access_token: 'tok', token_type: 'bearer' });
  await renderizar(<Login />);
  await user.type(screen.getByLabelText('E-mail'), ' ana@exemplo.com ');
  await user.type(screen.getByLabelText('Senha'), 'segredo123');
  await user.press(screen.getByRole('button', { name: 'Entrar' }));
  await waitFor(() => expect(useSessao.getState().status).toBe('autenticado'));
  expect(authApi.login).toHaveBeenCalledWith({ email: 'ana@exemplo.com', senha: 'segredo123' });
  expect(useSessao.getState().email).toBe('ana@exemplo.com');
});

it('401 mostra mensagem de credenciais incorretas e mantém anônimo', async () => {
  const user = userEvent.setup();
  jest.mocked(authApi.login).mockRejectedValue(new ApiError(401, 'Credenciais inválidas'));
  await renderizar(<Login />);
  await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
  await user.type(screen.getByLabelText('Senha'), 'errada');
  await user.press(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos');
  expect(useSessao.getState().status).toBe('anonimo');
});
