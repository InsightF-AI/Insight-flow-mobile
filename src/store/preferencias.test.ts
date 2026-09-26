import * as SecureStore from 'expo-secure-store';

import { usePreferencias } from '@/store/preferencias';

const armazenamento = (SecureStore as unknown as { __armazenamento: Map<string, string> }).__armazenamento;

beforeEach(() => {
  armazenamento.clear();
  usePreferencias.setState({ tema: 'escuro', hidratado: false });
});

describe('usePreferencias', () => {
  it('começa no tema escuro, ainda não hidratado', () => {
    expect(usePreferencias.getState()).toMatchObject({ tema: 'escuro', hidratado: false });
  });

  it('hidratar lê o tema claro salvo', async () => {
    armazenamento.set('insightflow.tema', 'claro');
    await usePreferencias.getState().hidratar();
    expect(usePreferencias.getState()).toMatchObject({ tema: 'claro', hidratado: true });
  });

  it('hidratar sem valor salvo mantém o escuro', async () => {
    await usePreferencias.getState().hidratar();
    expect(usePreferencias.getState()).toMatchObject({ tema: 'escuro', hidratado: true });
  });

  it('valor salvo inválido cai em escuro', async () => {
    armazenamento.set('insightflow.tema', 'sepia');
    await usePreferencias.getState().hidratar();
    expect(usePreferencias.getState()).toMatchObject({ tema: 'escuro', hidratado: true });
  });

  it('erro de leitura do SecureStore cai em escuro e marca como hidratado (não trava a splash)', async () => {
    jest.spyOn(SecureStore, 'getItemAsync').mockRejectedValueOnce(new Error('falha'));
    await usePreferencias.getState().hidratar();
    expect(usePreferencias.getState()).toMatchObject({ tema: 'escuro', hidratado: true });
  });

  it('definirTema atualiza o estado e persiste', async () => {
    await usePreferencias.getState().definirTema('claro');
    expect(usePreferencias.getState().tema).toBe('claro');
    expect(armazenamento.get('insightflow.tema')).toBe('claro');
  });

  it('definirTema mantém o estado mesmo se a gravação falhar', async () => {
    jest.spyOn(SecureStore, 'setItemAsync').mockRejectedValueOnce(new Error('falha'));
    await expect(usePreferencias.getState().definirTema('claro')).resolves.toBeUndefined();
    expect(usePreferencias.getState().tema).toBe('claro');
  });
});
