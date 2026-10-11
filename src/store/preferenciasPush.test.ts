import * as SecureStore from 'expo-secure-store';

import { usePreferencias } from '@/store/preferencias';

const armazenamento = (SecureStore as unknown as { __armazenamento: Map<string, string> }).__armazenamento;

beforeEach(() => {
  armazenamento.clear();
  usePreferencias.setState({ tema: 'escuro', pushLigado: true, hidratado: false });
});

it('o push começa ligado', () => {
  expect(usePreferencias.getState().pushLigado).toBe(true);
});

it('desligar persiste e sobrevive à hidratação', async () => {
  await usePreferencias.getState().definirPushLigado(false);
  expect(armazenamento.get('insightflow.push')).toBe('0');

  usePreferencias.setState({ pushLigado: true });
  await usePreferencias.getState().hidratar();

  expect(usePreferencias.getState().pushLigado).toBe(false);
});

it('ligar persiste', async () => {
  armazenamento.set('insightflow.push', '0');
  await usePreferencias.getState().definirPushLigado(true);
  expect(armazenamento.get('insightflow.push')).toBe('1');
});

it('sem valor guardado a hidratação mantém ligado e o tema', async () => {
  armazenamento.set('insightflow.tema', 'claro');
  await usePreferencias.getState().hidratar();
  expect(usePreferencias.getState()).toMatchObject({ tema: 'claro', pushLigado: true, hidratado: true });
});

it('falha de gravação não derruba: a escolha vale nesta sessão', async () => {
  jest.spyOn(SecureStore, 'setItemAsync').mockRejectedValueOnce(new Error('falha'));
  await usePreferencias.getState().definirPushLigado(false);
  expect(usePreferencias.getState().pushLigado).toBe(false);
});
