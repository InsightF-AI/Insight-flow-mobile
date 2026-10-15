import * as SecureStore from 'expo-secure-store';

import { authApi } from '@/api/auth';
import { ApiError } from '@/api/client';
import type { TokenResponse } from '@/api/tipos';
import { queryClient } from '@/hooks/queryClient';
import { pertoDeVencer, useSessao } from '@/store/sessao';

jest.mock('@/api/auth', () => ({ authApi: { renovar: jest.fn(), sair: jest.fn() } }));

const armazenamento = (SecureStore as unknown as { __armazenamento: Map<string, string> }).__armazenamento;
const CHAVE = 'insightflow.sessao';

function tokens(sufixo: string): TokenResponse {
  return { access_token: `acc-${sufixo}`, refresh_token: `ref-${sufixo}`, token_type: 'bearer', expires_in: 1800 };
}

function sessaoSalva(): unknown {
  const bruto = armazenamento.get(CHAVE);
  return bruto === undefined ? undefined : JSON.parse(bruto);
}

const AUTENTICADO = {
  status: 'autenticado',
  token: 'acc-1',
  refreshToken: 'ref-1',
  expiraEm: 0,
  email: 'ana@exemplo.com',
} as const;

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  armazenamento.clear();
  useSessao.setState({ status: 'carregando', token: null, refreshToken: null, expiraEm: null, email: null });
  // authApi.sair é chamado sem await e com .catch: o mock precisa devolver uma promessa.
  jest.mocked(authApi.sair).mockResolvedValue(undefined);
});

describe('hidratar', () => {
  it('sem sessão salva fica anônimo', async () => {
    await useSessao.getState().hidratar();
    expect(useSessao.getState().status).toBe('anonimo');
  });

  it('com sessão salva fica autenticado com os dois tokens', async () => {
    armazenamento.set(
      CHAVE,
      JSON.stringify({ accessToken: 'acc-1', refreshToken: 'ref-1', expiraEm: 123, email: 'ana@exemplo.com' }),
    );
    await useSessao.getState().hidratar();
    expect(useSessao.getState()).toMatchObject({
      status: 'autenticado',
      token: 'acc-1',
      refreshToken: 'ref-1',
      expiraEm: 123,
      email: 'ana@exemplo.com',
    });
  });

  it('sessão do MVP antigo (só access token) fica anônima e as chaves antigas são apagadas', async () => {
    armazenamento.set('insightflow.token', 'tok-antigo');
    armazenamento.set('insightflow.email', 'ana@exemplo.com');
    await useSessao.getState().hidratar();
    expect(useSessao.getState().status).toBe('anonimo');
    expect(armazenamento.has('insightflow.token')).toBe(false);
    expect(armazenamento.has('insightflow.email')).toBe(false);
  });

  it.each(['{nao é json', JSON.stringify({ accessToken: 1 }), JSON.stringify(null)])(
    'sessão salva inválida (%s) fica anônima',
    async (bruto) => {
      armazenamento.set(CHAVE, bruto);
      await useSessao.getState().hidratar();
      expect(useSessao.getState().status).toBe('anonimo');
    },
  );

  it('falha de leitura fica anônimo', async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('keystore indisponível'));
    await useSessao.getState().hidratar();
    expect(useSessao.getState().status).toBe('anonimo');
  });
});

describe('entrar', () => {
  it('grava a sessão numa única chave, com o vencimento calculado, e autentica', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    await useSessao.getState().entrar(tokens('1'), 'ana@exemplo.com');
    expect(sessaoSalva()).toEqual({
      accessToken: 'acc-1',
      refreshToken: 'ref-1',
      expiraEm: 2_800_000,
      email: 'ana@exemplo.com',
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(useSessao.getState()).toMatchObject({ status: 'autenticado', token: 'acc-1', refreshToken: 'ref-1', expiraEm: 2_800_000 });
  });

  it('falha ao gravar mantém anônimo e repassa o erro', async () => {
    useSessao.setState({ status: 'anonimo' });
    const falha = new Error('keystore cheio');
    jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(falha);
    await expect(useSessao.getState().entrar(tokens('1'), 'ana@exemplo.com')).rejects.toBe(falha);
    expect(armazenamento.size).toBe(0);
    expect(useSessao.getState()).toMatchObject({ status: 'anonimo', token: null, refreshToken: null });
  });
});

describe('renovar', () => {
  beforeEach(() => useSessao.setState(AUTENTICADO));

  it('troca o par, guarda o refresh novo e devolve o access novo', async () => {
    jest.mocked(authApi.renovar).mockResolvedValue(tokens('2'));
    await expect(useSessao.getState().renovar()).resolves.toBe('acc-2');
    expect(authApi.renovar).toHaveBeenCalledWith('ref-1');
    expect(useSessao.getState()).toMatchObject({ token: 'acc-2', refreshToken: 'ref-2' });
    expect(sessaoSalva()).toMatchObject({ accessToken: 'acc-2', refreshToken: 'ref-2', email: 'ana@exemplo.com' });
  });

  it('chamadas simultâneas fazem uma única renovação', async () => {
    let liberar: (valor: TokenResponse) => void = () => {};
    jest.mocked(authApi.renovar).mockReturnValue(new Promise<TokenResponse>((resolver) => (liberar = resolver)));
    const primeira = useSessao.getState().renovar();
    const segunda = useSessao.getState().renovar();
    liberar(tokens('2'));
    await expect(Promise.all([primeira, segunda])).resolves.toEqual(['acc-2', 'acc-2']);
    expect(authApi.renovar).toHaveBeenCalledTimes(1);
  });

  it('depois de terminar, a próxima renovação usa o refresh novo', async () => {
    jest.mocked(authApi.renovar).mockResolvedValueOnce(tokens('2')).mockResolvedValueOnce(tokens('3'));
    await useSessao.getState().renovar();
    await useSessao.getState().renovar();
    expect(authApi.renovar).toHaveBeenNthCalledWith(1, 'ref-1');
    expect(authApi.renovar).toHaveBeenNthCalledWith(2, 'ref-2');
  });

  it('refresh recusado (401) encerra a sessão sem pedir logout ao servidor', async () => {
    armazenamento.set(CHAVE, 'qualquer');
    jest.mocked(authApi.renovar).mockRejectedValue(new ApiError(401, 'Refresh token invalido'));
    await expect(useSessao.getState().renovar()).resolves.toBeNull();
    expect(useSessao.getState().status).toBe('anonimo');
    expect(armazenamento.has(CHAVE)).toBe(false);
    expect(authApi.sair).not.toHaveBeenCalled();
  });

  it('falha de rede rejeita e mantém a sessão', async () => {
    const semRede = new ApiError(0, 'Sem conexão com o servidor (http://api)', { causa: 'rede' });
    jest.mocked(authApi.renovar).mockRejectedValue(semRede);
    await expect(useSessao.getState().renovar()).rejects.toBe(semRede);
    expect(useSessao.getState()).toMatchObject({ status: 'autenticado', token: 'acc-1', refreshToken: 'ref-1' });
  });

  it('logout durante a renovação não ressuscita a sessão', async () => {
    let liberar: (valor: TokenResponse) => void = () => {};
    jest.mocked(authApi.renovar).mockReturnValue(new Promise<TokenResponse>((resolver) => (liberar = resolver)));
    const renovacao = useSessao.getState().renovar();
    await useSessao.getState().sair();
    liberar(tokens('2'));
    await expect(renovacao).resolves.toBeNull();
    expect(useSessao.getState().status).toBe('anonimo');
    expect(armazenamento.has(CHAVE)).toBe(false);
  });

  it('falha ao gravar a sessão renovada mantém os tokens novos em memória', async () => {
    jest.mocked(authApi.renovar).mockResolvedValue(tokens('2'));
    jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('keystore cheio'));
    await expect(useSessao.getState().renovar()).resolves.toBe('acc-2');
    expect(useSessao.getState()).toMatchObject({ status: 'autenticado', token: 'acc-2', refreshToken: 'ref-2' });
  });

  it('sem refresh token devolve null sem chamar o servidor', async () => {
    useSessao.setState({ status: 'anonimo', token: null, refreshToken: null, expiraEm: null, email: null });
    await expect(useSessao.getState().renovar()).resolves.toBeNull();
    expect(authApi.renovar).not.toHaveBeenCalled();
  });
});

describe('sair', () => {
  it('revoga no servidor, apaga a sessão, limpa o cache e fica anônimo', async () => {
    const limpar = jest.spyOn(queryClient, 'clear');
    armazenamento.set(CHAVE, 'qualquer');
    useSessao.setState(AUTENTICADO);
    await useSessao.getState().sair();
    expect(authApi.sair).toHaveBeenCalledWith('ref-1');
    expect(armazenamento.size).toBe(0);
    expect(limpar).toHaveBeenCalled();
    expect(useSessao.getState()).toMatchObject({ status: 'anonimo', token: null, refreshToken: null, expiraEm: null, email: null });
  });

  it('falha ao revogar no servidor não impede a saída', async () => {
    jest.mocked(authApi.sair).mockRejectedValue(new ApiError(0, 'Sem conexão', { causa: 'rede' }));
    useSessao.setState(AUTENTICADO);
    await expect(useSessao.getState().sair()).resolves.toBeUndefined();
    expect(useSessao.getState().status).toBe('anonimo');
  });

  it('revogarNoServidor: false não chama o servidor', async () => {
    useSessao.setState(AUTENTICADO);
    await useSessao.getState().sair({ revogarNoServidor: false });
    expect(authApi.sair).not.toHaveBeenCalled();
  });

  it('duas saídas seguidas não quebram e revogam uma vez só', async () => {
    useSessao.setState(AUTENTICADO);
    await Promise.all([useSessao.getState().sair(), useSessao.getState().sair()]);
    expect(useSessao.getState().status).toBe('anonimo');
    expect(authApi.sair).toHaveBeenCalledTimes(1);
  });
});

describe('pertoDeVencer', () => {
  it.each([
    [null, false],
    [60_000, false],
    [59_999, true],
    [-1, true],
  ])('expiraEm %p com agora = 0 → %p', (expiraEm, esperado) => {
    expect(pertoDeVencer(expiraEm, 0)).toBe(esperado);
  });
});
