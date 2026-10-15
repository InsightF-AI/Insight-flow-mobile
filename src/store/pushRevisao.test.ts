import * as SecureStore from 'expo-secure-store';

import { ApiError } from '@/api/client';
import { dispositivosApi } from '@/api/dispositivos';
import { lerSuporte, prepararPush } from '@/notificacoes/push';
import { usePreferencias } from '@/store/preferencias';
import { usePush } from '@/store/push';
import { useSessao } from '@/store/sessao';

// Achados da revisão independente da Etapa 8: o aparelho não pode seguir registrado, nem o interruptor travar, sem a
// tela mostrar isso.
jest.mock('@/api/dispositivos', () => ({ dispositivosApi: { registrar: jest.fn(), remover: jest.fn() } }));
jest.mock('@/api/auth', () => ({ authApi: { sair: jest.fn(async () => undefined), renovar: jest.fn() } }));
jest.mock('@/notificacoes/push', () => ({
  lerSuporte: jest.fn(),
  prepararPush: jest.fn(),
  configurarExibicaoEmPrimeiroPlano: jest.fn(async () => undefined),
}));

const armazenamento = (SecureStore as unknown as { __armazenamento: Map<string, string> }).__armazenamento;
const TOKEN = 'ExponentPushToken[abc]';

function pendente<T>() {
  let resolver: (valor: T) => void = () => {};
  const promessa = new Promise<T>((ok) => {
    resolver = ok;
  });
  return { promessa, resolver };
}

beforeEach(() => {
  jest.clearAllMocks();
  armazenamento.clear();
  usePreferencias.setState({ pushLigado: true });
  useSessao.setState({ status: 'autenticado', token: 'tok', refreshToken: 'ref', expiraEm: null, email: 'a@b.c' });
  usePush.getState().reiniciar();
  jest.mocked(lerSuporte).mockReturnValue({ suportado: true, projectId: 'proj-1' });
  jest.mocked(prepararPush).mockResolvedValue({ estado: 'pronto', token: TOKEN });
  jest.mocked(dispositivosApi.registrar).mockResolvedValue({ token: TOKEN, ativo: true });
  jest.mocked(dispositivosApi.remover).mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('o servidor pode ter gravado o aparelho mesmo sem a resposta', () => {
  it('registro que falhou depois do POST: o token continua guardado e desligar o remove', async () => {
    jest.mocked(dispositivosApi.registrar).mockRejectedValueOnce(new ApiError(0, 'Sem conexão', { causa: 'rede' }));
    await usePush.getState().sincronizar();
    expect(usePush.getState()).toMatchObject({ situacao: 'erro', token: TOKEN });

    await usePush.getState().desligar();

    expect(dispositivosApi.remover).toHaveBeenCalledWith(TOKEN);
  });

  it('sair durante o registro espera o POST terminar e só então remove o aparelho', async () => {
    const resposta = pendente<{ token: string; ativo: boolean }>();
    jest.mocked(dispositivosApi.registrar).mockReturnValue(resposta.promessa);
    const registro = usePush.getState().sincronizar();
    await Promise.resolve();
    await Promise.resolve();

    const saida = usePush.getState().desregistrar();
    await Promise.resolve();
    await Promise.resolve();
    // Enquanto o POST não termina o servidor ainda pode gravar o aparelho: o DELETE espera.
    expect(dispositivosApi.remover).not.toHaveBeenCalled();
    resposta.resolver({ token: TOKEN, ativo: true });
    await Promise.all([registro, saida]);

    expect(dispositivosApi.remover).toHaveBeenCalledWith(TOKEN);
  });
});

describe('desligar', () => {
  it('se o servidor não confirma a remoção, a escolha não muda e o erro chega a quem chamou', async () => {
    await usePush.getState().sincronizar();
    const erro = new ApiError(0, 'Sem conexão', { causa: 'rede' });
    jest.mocked(dispositivosApi.remover).mockRejectedValue(erro);

    await expect(usePush.getState().desligar()).rejects.toBe(erro);

    expect(usePreferencias.getState().pushLigado).toBe(true);
    expect(armazenamento.get('insightflow.push')).toBeUndefined();
    expect(usePush.getState()).toMatchObject({ situacao: 'ligado', token: TOKEN });
  });

  it('com a remoção confirmada, grava a escolha e desliga', async () => {
    await usePush.getState().sincronizar();

    await usePush.getState().desligar();

    expect(usePreferencias.getState().pushLigado).toBe(false);
    expect(armazenamento.get('insightflow.push')).toBe('0');
    expect(usePush.getState()).toMatchObject({ situacao: 'desligado', token: null });
  });

  it('sem token conhecido não chama o servidor e desliga', async () => {
    usePush.setState({ situacao: 'negado', token: null });

    await usePush.getState().desligar();

    expect(dispositivosApi.remover).not.toHaveBeenCalled();
    expect(usePush.getState().situacao).toBe('desligado');
  });
});

describe('registro que não termina', () => {
  it('vira erro em 30 s, deixa tentar de novo e ignora o resultado tardio', async () => {
    jest.useFakeTimers();
    const parado = pendente<{ estado: 'pronto'; token: string }>();
    jest.mocked(prepararPush).mockReturnValueOnce(parado.promessa);

    const execucao = usePush.getState().sincronizar();
    await jest.advanceTimersByTimeAsync(29_999);
    expect(usePush.getState().situacao).toBe('verificando');
    await jest.advanceTimersByTimeAsync(1);
    await execucao;

    expect(usePush.getState().situacao).toBe('erro');
    expect(usePush.getState().erro).toMatchObject({ status: 0, causa: 'tempo' });

    parado.resolver({ estado: 'pronto', token: 'ExponentPushToken[tardio]' });
    await jest.advanceTimersByTimeAsync(0);
    expect(dispositivosApi.registrar).not.toHaveBeenCalled();
    expect(usePush.getState().situacao).toBe('erro');

    await usePush.getState().sincronizar();
    expect(usePush.getState()).toMatchObject({ situacao: 'ligado', token: TOKEN });
  });
});
