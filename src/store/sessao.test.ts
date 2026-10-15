import * as SecureStore from 'expo-secure-store';

import { queryClient } from '@/hooks/queryClient';
import { useSessao } from '@/store/sessao';

const armazenamento = (SecureStore as unknown as { __armazenamento: Map<string, string> }).__armazenamento;

beforeEach(() => {
  armazenamento.clear();
  useSessao.setState({ status: 'carregando', token: null, email: null });
});

it('hidratar sem token salvo fica anônimo', async () => {
  await useSessao.getState().hidratar();
  expect(useSessao.getState().status).toBe('anonimo');
});

it('hidratar com token salvo fica autenticado', async () => {
  armazenamento.set('insightflow.token', 'tok');
  armazenamento.set('insightflow.email', 'ana@exemplo.com');
  await useSessao.getState().hidratar();
  expect(useSessao.getState()).toMatchObject({ status: 'autenticado', token: 'tok', email: 'ana@exemplo.com' });
});

it('hidratar com falha de leitura fica anônimo', async () => {
  jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('keystore indisponível'));
  await useSessao.getState().hidratar();
  expect(useSessao.getState().status).toBe('anonimo');
});

it('entrar grava no SecureStore e autentica', async () => {
  await useSessao.getState().entrar('tok', 'ana@exemplo.com');
  expect(armazenamento.get('insightflow.token')).toBe('tok');
  expect(armazenamento.get('insightflow.email')).toBe('ana@exemplo.com');
  expect(useSessao.getState()).toMatchObject({ status: 'autenticado', token: 'tok' });
});

it('entrar com falha ao gravar o e-mail não deixa credencial parcial e continua anônimo', async () => {
  useSessao.setState({ status: 'anonimo', token: null, email: null });
  const falha = new Error('keystore cheio');
  jest.mocked(SecureStore.setItemAsync).mockImplementationOnce(async (chave: string, valor: string) => {
    armazenamento.set(chave, valor);
  });
  jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(falha);

  await expect(useSessao.getState().entrar('tok', 'ana@exemplo.com')).rejects.toBe(falha);

  expect(armazenamento.size).toBe(0);
  expect(useSessao.getState()).toMatchObject({ status: 'anonimo', token: null, email: null });
});

it('sair apaga o SecureStore, limpa o cache e fica anônimo', async () => {
  const limpar = jest.spyOn(queryClient, 'clear');
  armazenamento.set('insightflow.token', 'tok');
  armazenamento.set('insightflow.email', 'ana@exemplo.com');
  useSessao.setState({ status: 'autenticado', token: 'tok', email: 'ana@exemplo.com' });

  await useSessao.getState().sair();

  expect(armazenamento.size).toBe(0);
  expect(limpar).toHaveBeenCalled();
  expect(useSessao.getState()).toMatchObject({ status: 'anonimo', token: null, email: null });
});

it('sair duas vezes seguidas (vários 401 em paralelo) não quebra', async () => {
  useSessao.setState({ status: 'autenticado', token: 'tok', email: 'ana@exemplo.com' });
  await Promise.all([useSessao.getState().sair(), useSessao.getState().sair()]);
  expect(useSessao.getState().status).toBe('anonimo');
});
