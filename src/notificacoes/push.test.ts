import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notificacoes from 'expo-notifications';
import { Platform } from 'react-native';

import {
  configurarExibicaoEmPrimeiroPlano,
  lerSuporte,
  observarMudancaDeToken,
  observarToques,
  prepararPush,
} from '@/notificacoes/push';

jest.mock('expo', () => ({ isRunningInExpoGo: jest.fn(() => false) }));
jest.mock('expo-device', () => ({ __esModule: true, isDevice: true }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'proj-1' } } }, easConfig: null },
}));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  addPushTokenListener: jest.fn(),
}));

const constantes = Constants as unknown as { expoConfig: unknown; easConfig: unknown };
const aparelho = Device as unknown as { isDevice: boolean };

function permissao(status: 'granted' | 'denied' | 'undetermined', canAskAgain = true) {
  return { status, granted: status === 'granted', canAskAgain, expires: 'never' };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(isRunningInExpoGo).mockReturnValue(false);
  aparelho.isDevice = true;
  constantes.expoConfig = { extra: { eas: { projectId: 'proj-1' } } };
  constantes.easConfig = null;
  jest.replaceProperty(Platform, 'OS', 'ios');
  jest.mocked(Notificacoes.getPermissionsAsync).mockResolvedValue(permissao('granted') as never);
  jest.mocked(Notificacoes.getExpoPushTokenAsync).mockResolvedValue({ type: 'expo', data: 'ExponentPushToken[abc]' });
});

describe('lerSuporte', () => {
  it('development build em aparelho físico com projectId', () => {
    expect(lerSuporte()).toEqual({ suportado: true, projectId: 'proj-1' });
  });

  it('projectId vem do easConfig quando não está no expoConfig', () => {
    constantes.expoConfig = { extra: {} };
    constantes.easConfig = { projectId: 'proj-eas' };
    expect(lerSuporte()).toEqual({ suportado: true, projectId: 'proj-eas' });
  });

  it('Expo Go', () => {
    jest.mocked(isRunningInExpoGo).mockReturnValue(true);
    expect(lerSuporte()).toEqual({ suportado: false, motivo: 'expo-go' });
  });

  it('simulador', () => {
    aparelho.isDevice = false;
    expect(lerSuporte()).toEqual({ suportado: false, motivo: 'aparelho-fisico' });
  });

  it('sem projectId', () => {
    constantes.expoConfig = { extra: {} };
    expect(lerSuporte()).toEqual({ suportado: false, motivo: 'sem-projeto' });
  });
});

describe('prepararPush', () => {
  it('permissão já concedida: devolve o token do projeto sem pedir nada', async () => {
    const resultado = await prepararPush('proj-1', { pedirPermissao: false });

    expect(resultado).toEqual({ estado: 'pronto', token: 'ExponentPushToken[abc]' });
    expect(Notificacoes.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notificacoes.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'proj-1' });
  });

  it('Android cria o canal default antes de pedir a permissão (exigência do Android 13+)', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.mocked(Notificacoes.getPermissionsAsync).mockResolvedValue(permissao('undetermined') as never);
    jest.mocked(Notificacoes.requestPermissionsAsync).mockResolvedValue(permissao('granted') as never);

    await prepararPush('proj-1', { pedirPermissao: false });

    expect(Notificacoes.setNotificationChannelAsync).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({ importance: 4 }),
    );
    const canal = jest.mocked(Notificacoes.setNotificationChannelAsync).mock.invocationCallOrder[0];
    const pedido = jest.mocked(Notificacoes.requestPermissionsAsync).mock.invocationCallOrder[0];
    expect(canal).toBeLessThan(pedido);
  });

  it('iOS não cria canal', async () => {
    await prepararPush('proj-1', { pedirPermissao: false });
    expect(Notificacoes.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('permissão ainda não decidida: pede sozinho, mesmo sem o usuário ter pedido', async () => {
    jest.mocked(Notificacoes.getPermissionsAsync).mockResolvedValue(permissao('undetermined') as never);
    jest.mocked(Notificacoes.requestPermissionsAsync).mockResolvedValue(permissao('granted') as never);

    const resultado = await prepararPush('proj-1', { pedirPermissao: false });

    expect(Notificacoes.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(resultado.estado).toBe('pronto');
  });

  it('negada antes: não pede de novo a cada login', async () => {
    jest.mocked(Notificacoes.getPermissionsAsync).mockResolvedValue(permissao('denied', true) as never);

    const resultado = await prepararPush('proj-1', { pedirPermissao: false });

    expect(Notificacoes.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notificacoes.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(resultado).toEqual({ estado: 'negado', podePedirDeNovo: true });
  });

  it('negada antes, mas o usuário pediu no Perfil: pede de novo', async () => {
    jest.mocked(Notificacoes.getPermissionsAsync).mockResolvedValue(permissao('denied', true) as never);
    jest.mocked(Notificacoes.requestPermissionsAsync).mockResolvedValue(permissao('granted') as never);

    const resultado = await prepararPush('proj-1', { pedirPermissao: true });

    expect(Notificacoes.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(resultado.estado).toBe('pronto');
  });

  it('bloqueada de vez (não pode perguntar): fica negado sem tentar', async () => {
    jest.mocked(Notificacoes.getPermissionsAsync).mockResolvedValue(permissao('denied', false) as never);

    const resultado = await prepararPush('proj-1', { pedirPermissao: true });

    expect(Notificacoes.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(resultado).toEqual({ estado: 'negado', podePedirDeNovo: false });
  });

  it('o usuário nega no diálogo do sistema', async () => {
    jest.mocked(Notificacoes.getPermissionsAsync).mockResolvedValue(permissao('undetermined') as never);
    jest.mocked(Notificacoes.requestPermissionsAsync).mockResolvedValue(permissao('denied', false) as never);

    const resultado = await prepararPush('proj-1', { pedirPermissao: false });

    expect(resultado).toEqual({ estado: 'negado', podePedirDeNovo: false });
    expect(Notificacoes.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('falha ao obter o token propaga o erro (quem chama mostra "tentar novamente")', async () => {
    jest.mocked(Notificacoes.getExpoPushTokenAsync).mockRejectedValue(new Error('offline'));
    await expect(prepararPush('proj-1', { pedirPermissao: false })).rejects.toThrow('offline');
  });
});

describe('configurarExibicaoEmPrimeiroPlano', () => {
  it('suprime o banner do sistema: o WebSocket já mostra o banner do aplicativo', async () => {
    await configurarExibicaoEmPrimeiroPlano();

    const { handleNotification } = jest.mocked(Notificacoes.setNotificationHandler).mock.calls[0][0] as unknown as {
      handleNotification: () => Promise<Record<string, boolean>>;
    };
    expect(await handleNotification()).toEqual({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    });
  });
});

describe('observarToques', () => {
  const resposta = (identificador: string, dados: unknown) => ({
    notification: { request: { identifier: identificador, content: { data: dados } } },
  });

  it('entrega os dados do push tocado e cancela a assinatura', async () => {
    const remover = jest.fn();
    let ouvinte: (r: unknown) => void = () => {};
    jest.mocked(Notificacoes.addNotificationResponseReceivedListener).mockImplementation(((fn: (r: unknown) => void) => {
      ouvinte = fn;
      return { remove: remover };
    }) as never);
    const aoToque = jest.fn();

    const cancelar = await observarToques(aoToque);
    ouvinte(resposta('p-1', { notificacao_id: 'n-1', ativo_id: 'a-1' }));

    expect(aoToque).toHaveBeenCalledWith({ notificacao_id: 'n-1', ativo_id: 'a-1' });
    cancelar();
    expect(remover).toHaveBeenCalledTimes(1);
  });

  it('o toque que abriu o app (partida a frio) é tratado uma vez só', async () => {
    jest.mocked(Notificacoes.addNotificationResponseReceivedListener).mockReturnValue({ remove: jest.fn() } as never);
    jest
      .mocked(Notificacoes.getLastNotificationResponseAsync)
      .mockResolvedValue(resposta('p-frio', { notificacao_id: 'n-9' }) as never);
    const aoToque = jest.fn();

    await observarToques(aoToque);
    await observarToques(aoToque);

    expect(aoToque).toHaveBeenCalledTimes(1);
    expect(aoToque).toHaveBeenCalledWith({ notificacao_id: 'n-9' });
  });

  it('em ambiente sem push não carrega nem assina nada', async () => {
    jest.mocked(isRunningInExpoGo).mockReturnValue(true);

    const cancelar = await observarToques(jest.fn());
    cancelar();

    expect(Notificacoes.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
    expect(Notificacoes.getLastNotificationResponseAsync).not.toHaveBeenCalled();
  });
});

describe('observarMudancaDeToken', () => {
  it('avisa quando o token do aparelho muda', async () => {
    let ouvinte: () => void = () => {};
    const remover = jest.fn();
    jest.mocked(Notificacoes.addPushTokenListener).mockImplementation(((fn: () => void) => {
      ouvinte = fn;
      return { remove: remover };
    }) as never);
    const aoMudar = jest.fn();

    const cancelar = await observarMudancaDeToken(aoMudar);
    ouvinte();

    expect(aoMudar).toHaveBeenCalledTimes(1);
    cancelar();
    expect(remover).toHaveBeenCalledTimes(1);
  });

  it('em ambiente sem push não assina', async () => {
    aparelho.isDevice = false;
    const cancelar = await observarMudancaDeToken(jest.fn());
    cancelar();
    expect(Notificacoes.addPushTokenListener).not.toHaveBeenCalled();
  });
});
