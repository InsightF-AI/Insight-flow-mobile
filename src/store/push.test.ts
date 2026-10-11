import * as SecureStore from 'expo-secure-store';

import { ApiError } from '@/api/client';
import { dispositivosApi } from '@/api/dispositivos';
import { lerSuporte, prepararPush } from '@/notificacoes/push';
import { usePreferencias } from '@/store/preferencias';
import { usePush } from '@/store/push';
import { useSessao } from '@/store/sessao';

jest.mock('@/api/dispositivos', () => ({ dispositivosApi: { registrar: jest.fn(), remover: jest.fn() } }));
jest.mock('@/api/auth', () => ({ authApi: { sair: jest.fn(async () => undefined), renovar: jest.fn() } }));
jest.mock('@/notificacoes/push', () => ({
  lerSuporte: jest.fn(),
  prepararPush: jest.fn(),
  configurarExibicaoEmPrimeiroPlano: jest.fn(async () => undefined),
}));

const armazenamento = (SecureStore as unknown as { __armazenamento: Map<string, string> }).__armazenamento;
const SUPORTADO = { suportado: true, projectId: 'proj-1' } as const;

function pendente<T>() {
  let resolver: (valor: T) => void = () => {};
  const promessa = new Promise<T>((ok) => {
    resolver = ok;
  });
  return { promessa, resolver };
}

beforeEach(async () => {
  jest.clearAllMocks();
  armazenamento.clear();
  usePreferencias.setState({ pushLigado: true });
  useSessao.setState({ status: 'autenticado', token: 'tok', refreshToken: 'ref', expiraEm: null, email: 'a@b.c' });
  usePush.getState().reiniciar();
  jest.mocked(lerSuporte).mockReturnValue(SUPORTADO);
  jest.mocked(prepararPush).mockResolvedValue({ estado: 'pronto', token: 'ExponentPushToken[abc]' });
  jest.mocked(dispositivosApi.registrar).mockResolvedValue({ token: 'ExponentPushToken[abc]', ativo: true });
  jest.mocked(dispositivosApi.remover).mockResolvedValue(undefined);
});

describe('sincronizar', () => {
  it('registra o aparelho e fica ligado', async () => {
    await usePush.getState().sincronizar();

    expect(prepararPush).toHaveBeenCalledWith('proj-1', { pedirPermissao: false });
    expect(dispositivosApi.registrar).toHaveBeenCalledWith('ExponentPushToken[abc]');
    expect(usePush.getState()).toMatchObject({ situacao: 'ligado', token: 'ExponentPushToken[abc]', erro: null });
  });

  it.each([
    ['expo-go' as const],
    ['aparelho-fisico' as const],
    ['sem-projeto' as const],
  ])('ambiente sem push (%s): indisponível, sem tocar em permissão nem em rede', async (motivo) => {
    jest.mocked(lerSuporte).mockReturnValue({ suportado: false, motivo });

    await usePush.getState().sincronizar();

    expect(usePush.getState()).toMatchObject({ situacao: 'indisponivel', motivo });
    expect(prepararPush).not.toHaveBeenCalled();
    expect(dispositivosApi.registrar).not.toHaveBeenCalled();
  });

  it('preferência desligada: não registra', async () => {
    usePreferencias.setState({ pushLigado: false });

    await usePush.getState().sincronizar();

    expect(usePush.getState().situacao).toBe('desligado');
    expect(prepararPush).not.toHaveBeenCalled();
  });

  it('permissão negada: fica negado e não registra', async () => {
    jest.mocked(prepararPush).mockResolvedValue({ estado: 'negado', podePedirDeNovo: false });

    await usePush.getState().sincronizar();

    expect(usePush.getState().situacao).toBe('negado');
    expect(dispositivosApi.registrar).not.toHaveBeenCalled();
  });

  it('o servidor recusa o token: erro visível, e dá para tentar de novo', async () => {
    const erro = new ApiError(422, 'Token de push invalido');
    jest.mocked(dispositivosApi.registrar).mockRejectedValueOnce(erro);

    await usePush.getState().sincronizar();
    expect(usePush.getState()).toMatchObject({ situacao: 'erro', erro });

    await usePush.getState().sincronizar();
    expect(usePush.getState()).toMatchObject({ situacao: 'ligado', erro: null });
    expect(dispositivosApi.registrar).toHaveBeenCalledTimes(2);
  });

  it('falha ao obter o token também vira erro (nada quebra)', async () => {
    jest.mocked(prepararPush).mockRejectedValueOnce(new Error('offline'));
    await usePush.getState().sincronizar();
    expect(usePush.getState().situacao).toBe('erro');
  });

  it('chamadas simultâneas compartilham a mesma execução', async () => {
    const espera = pendente<{ estado: 'pronto'; token: string }>();
    jest.mocked(prepararPush).mockReturnValue(espera.promessa);

    const a = usePush.getState().sincronizar();
    const b = usePush.getState().sincronizar();
    espera.resolver({ estado: 'pronto', token: 'ExponentPushToken[abc]' });
    await Promise.all([a, b]);

    expect(prepararPush).toHaveBeenCalledTimes(1);
    expect(dispositivosApi.registrar).toHaveBeenCalledTimes(1);
  });
});

describe('resultado tardio e novo login', () => {
  it('um registro que termina depois do logout não escreve estado', async () => {
    const espera = pendente<{ estado: 'pronto'; token: string }>();
    jest.mocked(prepararPush).mockReturnValue(espera.promessa);
    const execucao = usePush.getState().sincronizar();

    await useSessao.getState().sair({ revogarNoServidor: false });
    espera.resolver({ estado: 'pronto', token: 'ExponentPushToken[velho]' });
    await execucao;

    expect(dispositivosApi.registrar).not.toHaveBeenCalled();
    expect(usePush.getState()).toMatchObject({ situacao: 'verificando', token: null });
  });

  it('o login seguinte sincroniza mesmo com a execução antiga ainda pendente', async () => {
    const velha = pendente<{ estado: 'pronto'; token: string }>();
    jest.mocked(prepararPush).mockReturnValueOnce(velha.promessa);
    const execucaoVelha = usePush.getState().sincronizar();
    await useSessao.getState().sair({ revogarNoServidor: false });

    useSessao.setState({ status: 'autenticado', token: 'tok2', refreshToken: 'ref2', expiraEm: null, email: 'b@b.c' });
    jest.mocked(prepararPush).mockResolvedValueOnce({ estado: 'pronto', token: 'ExponentPushToken[novo]' });
    await usePush.getState().sincronizar();
    velha.resolver({ estado: 'pronto', token: 'ExponentPushToken[velho]' });
    await execucaoVelha;

    expect(dispositivosApi.registrar).toHaveBeenCalledTimes(1);
    expect(dispositivosApi.registrar).toHaveBeenCalledWith('ExponentPushToken[novo]');
    expect(usePush.getState()).toMatchObject({ situacao: 'ligado', token: 'ExponentPushToken[novo]' });
  });
});

describe('ligar e desligar', () => {
  it('ligar grava a preferência e pede a permissão (pedido explícito do usuário)', async () => {
    usePreferencias.setState({ pushLigado: false });

    await usePush.getState().ligar();

    expect(usePreferencias.getState().pushLigado).toBe(true);
    expect(armazenamento.get('insightflow.push')).toBe('1');
    expect(prepararPush).toHaveBeenCalledWith('proj-1', { pedirPermissao: true });
    expect(usePush.getState().situacao).toBe('ligado');
  });

  it('desligar remove o aparelho do backend e grava a preferência', async () => {
    await usePush.getState().sincronizar();

    await usePush.getState().desligar();

    expect(dispositivosApi.remover).toHaveBeenCalledWith('ExponentPushToken[abc]');
    expect(usePreferencias.getState().pushLigado).toBe(false);
    expect(armazenamento.get('insightflow.push')).toBe('0');
    expect(usePush.getState()).toMatchObject({ situacao: 'desligado', token: null });
  });

  it('desligar vale mesmo que o servidor não responda', async () => {
    await usePush.getState().sincronizar();
    jest.mocked(dispositivosApi.remover).mockRejectedValue(new ApiError(0, 'Sem conexão', { causa: 'rede' }));

    await expect(usePush.getState().desligar()).resolves.toBeUndefined();

    expect(usePush.getState().situacao).toBe('desligado');
  });
});

describe('desregistrar (antes do logout)', () => {
  it('remove o aparelho sem mexer na preferência', async () => {
    await usePush.getState().sincronizar();

    await usePush.getState().desregistrar();

    expect(dispositivosApi.remover).toHaveBeenCalledWith('ExponentPushToken[abc]');
    expect(usePreferencias.getState().pushLigado).toBe(true);
  });

  it('sem token conhecido não chama o servidor', async () => {
    await usePush.getState().desregistrar();
    expect(dispositivosApi.remover).not.toHaveBeenCalled();
  });

  it('erro do servidor é engolido: sair não pode travar por isso', async () => {
    await usePush.getState().sincronizar();
    jest.mocked(dispositivosApi.remover).mockRejectedValue(new ApiError(500, 'Erro 500'));
    await expect(usePush.getState().desregistrar()).resolves.toBeUndefined();
  });
});

it('sair da conta reinicia a situação e esquece o token', async () => {
  await usePush.getState().sincronizar();
  expect(usePush.getState().token).not.toBeNull();

  await useSessao.getState().sair({ revogarNoServidor: false });

  expect(usePush.getState()).toMatchObject({ situacao: 'verificando', token: null, erro: null });
});
