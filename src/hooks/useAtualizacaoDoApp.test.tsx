import { renderHook } from '@testing-library/react-native';
import { Alert, AppState, type AppStateStatus } from 'react-native';

import * as atualizacoes from '@/atualizacoes/atualizacoes';
import { INTERVALO_ENTRE_VERIFICACOES_MS } from '@/dominio/atualizacao';
import { useAtualizacaoDoApp } from '@/hooks/useAtualizacaoDoApp';

jest.mock('@/atualizacoes/atualizacoes', () => ({
  atualizacoesLigadas: jest.fn(() => true),
  baixarAtualizacaoSeHouver: jest.fn(async () => undefined),
  reiniciarNaVersaoNova: jest.fn(async () => undefined),
  useAtualizacaoBaixada: jest.fn(() => ({ pronta: false, id: null })),
}));

const mockado = jest.mocked(atualizacoes);
let ouvinte: ((estado: AppStateStatus) => void) | null = null;
let agora = 1_000_000;

beforeEach(() => {
  jest.clearAllMocks();
  mockado.atualizacoesLigadas.mockReturnValue(true);
  mockado.useAtualizacaoBaixada.mockReturnValue({ pronta: false, id: null });
  ouvinte = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_tipo, funcao) => {
    ouvinte = funcao as (estado: AppStateStatus) => void;
    return { remove: jest.fn() };
  });
  jest.spyOn(Date, 'now').mockImplementation(() => agora);
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('ao voltar do segundo plano depois do intervalo, procura e baixa a versão nova', async () => {
  await renderHook(() => useAtualizacaoDoApp());
  agora += INTERVALO_ENTRE_VERIFICACOES_MS;
  ouvinte?.('active');
  expect(mockado.baixarAtualizacaoSeHouver).toHaveBeenCalledTimes(1);
});

it('não procura de novo antes do intervalo (a abertura já verificou) nem ao ir para o segundo plano', async () => {
  await renderHook(() => useAtualizacaoDoApp());
  ouvinte?.('background');
  agora += 60_000;
  ouvinte?.('active');
  expect(mockado.baixarAtualizacaoSeHouver).not.toHaveBeenCalled();
});

it('no Expo Go e em desenvolvimento não escuta nada', async () => {
  mockado.atualizacoesLigadas.mockReturnValue(false);
  await renderHook(() => useAtualizacaoDoApp());
  expect(ouvinte).toBeNull();
});

it('versão baixada: pergunta uma vez e reinicia se a pessoa aceitar', async () => {
  mockado.useAtualizacaoBaixada.mockReturnValue({ pronta: true, id: 'atualizacao-1' });
  const { rerender } = await renderHook(() => useAtualizacaoDoApp());
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  const [titulo, , botoes] = jest.mocked(Alert.alert).mock.calls[0];
  expect(titulo).toBe('Nova versão disponível');
  expect(botoes?.map((botao) => botao.text)).toEqual(['Depois', 'Reiniciar agora']);

  await rerender({});
  expect(Alert.alert).toHaveBeenCalledTimes(1);

  botoes?.[1].onPress?.();
  expect(mockado.reiniciarNaVersaoNova).toHaveBeenCalledTimes(1);
});

it('sem versão baixada, não pergunta', async () => {
  await renderHook(() => useAtualizacaoDoApp());
  expect(Alert.alert).not.toHaveBeenCalled();
});
