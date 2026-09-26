import * as SecureStore from 'expo-secure-store';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { authApi } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useSessao } from '@/store/sessao';
import { renderizar } from '@/test/renderizar';

import Cadastro from '../../app/(auth)/cadastro';

jest.mock('expo-router', () => ({ Link: ({ children }: { children: ReactNode }) => children }));
jest.mock('@/api/auth', () => ({ authApi: { login: jest.fn(), cadastrar: jest.fn() } }));

// A primeira renderização com cache frio do Jest carrega muitos módulos do React Native e passa dos 5 s padrão.
jest.setTimeout(20000);

const armazenamento = (SecureStore as unknown as { __armazenamento: Map<string, string> }).__armazenamento;

async function preencher() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Nome'), 'Ana');
  await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
  await user.type(screen.getByLabelText('Senha'), 'segredo123');
  await user.press(screen.getByRole('button', { name: 'Criar conta' }));
}

beforeEach(() => {
  jest.clearAllMocks();
  armazenamento.clear();
  useSessao.setState({ status: 'anonimo', token: null, email: null });
});

it('cadastro com sucesso já entra no app', async () => {
  jest.mocked(authApi.cadastrar).mockResolvedValue({ access_token: 'novo', token_type: 'bearer' });
  await renderizar(<Cadastro />);
  await preencher();
  await waitFor(() => expect(useSessao.getState().status).toBe('autenticado'));
  expect(authApi.cadastrar).toHaveBeenCalledWith({ nome: 'Ana', email: 'ana@exemplo.com', senha: 'segredo123' });
});

it('409 marca o e-mail como já cadastrado', async () => {
  jest.mocked(authApi.cadastrar).mockRejectedValue(new ApiError(409, 'E-mail já cadastrado'));
  await renderizar(<Cadastro />);
  await preencher();
  expect(await screen.findByText('E-mail já cadastrado')).toBeOnTheScreen();
  expect(useSessao.getState().status).toBe('anonimo');
});
