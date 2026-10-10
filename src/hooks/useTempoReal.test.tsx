import type { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { notificacoesApi } from '@/api/notificacoes';
import type { OpcoesTempoReal } from '@/api/tempoReal';
import type { ItemWatchlist, Notificacao } from '@/api/tipos';
import { chaves } from '@/hooks/chaves';
import { receberNotificacao, sincronizarNaoLidas, useTempoReal } from '@/hooks/useTempoReal';
import { useBanner } from '@/store/banner';
import { useConexaoTempoReal } from '@/store/tempoReal';
import { criarProvedor, criarQueryClientDeTeste } from '@/test/renderizar';

const mockConectar = jest.fn();
const mockDesconectar = jest.fn();
let mockOpcoes: OpcoesTempoReal | null = null;

jest.mock('@/api/tempoReal', () => ({
  criarClienteTempoReal: jest.fn((opcoes: OpcoesTempoReal) => {
    mockOpcoes = opcoes;
    return { conectar: mockConectar, desconectar: mockDesconectar };
  }),
}));
jest.mock('@/api/notificacoes', () => ({ notificacoesApi: { listar: jest.fn(), marcarComoLida: jest.fn() } }));

function notificacao(id: string, parcial: Partial<Notificacao> = {}): Notificacao {
  return {
    id,
    ativo_id: 'a-1',
    tipo: 'ALERTA_DISPARADO',
    mensagem: 'Preço atingiu o alvo',
    contexto: {},
    lida: false,
    criado_em: '2026-10-10T12:00:00Z',
    ...parcial,
  };
}

const itemWatchlist: ItemWatchlist = {
  ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: null, moeda: 'BRL' },
  notificar: true,
  adicionado_em: '2026-10-01T12:00:00Z',
};

let queryClient: QueryClient;
let mudancaDeEstado: ((estado: string) => void) | null = null;
const remover = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockOpcoes = null;
  mudancaDeEstado = null;
  queryClient = criarQueryClientDeTeste();
  useBanner.setState({ atual: null });
  useConexaoTempoReal.setState({ estado: 'desconectado' });
  jest.mocked(notificacoesApi.listar).mockResolvedValue([]);
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_tipo: string, ouvinte: (estado: string) => void) => {
    mudancaDeEstado = ouvinte;
    return { remove: remover };
  }) as never);
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
});

async function montar(url: string | null = 'ws://servidor/api/v1/notificacoes/ws') {
  return renderHook(() => useTempoReal(url), { wrapper: criarProvedor(queryClient) });
}

describe('useTempoReal', () => {
  it('conecta ao montar com o app em primeiro plano e desconecta ao desmontar', async () => {
    const { unmount } = await montar();
    expect(mockConectar).toHaveBeenCalledTimes(1);
    expect(mockOpcoes?.url).toBe('ws://servidor/api/v1/notificacoes/ws');
    await unmount();
    expect(mockDesconectar).toHaveBeenCalled();
    expect(remover).toHaveBeenCalled();
    expect(useConexaoTempoReal.getState().estado).toBe('desconectado');
  });

  it('sem endereço (configuração inválida) não cria cliente', async () => {
    await montar(null);
    expect(mockOpcoes).toBeNull();
    expect(mockConectar).not.toHaveBeenCalled();
  });

  it('o estado da conexão vai para a store (o polling de reserva depende dele)', async () => {
    await montar();
    mockOpcoes?.aoMudarEstado?.('conectado');
    expect(useConexaoTempoReal.getState().estado).toBe('conectado');
  });

  it('segundo plano fecha a conexão; voltar abre de novo', async () => {
    await montar();
    mockConectar.mockClear();
    mudancaDeEstado?.('background');
    expect(mockDesconectar).toHaveBeenCalledTimes(1);
    mockConectar.mockReturnValue(true);
    mudancaDeEstado?.('active');
    expect(mockConectar).toHaveBeenCalledTimes(1);
  });

  it('voltar ao primeiro plano com a conexão já ativa sincroniza pelo REST', async () => {
    queryClient.setQueryData(chaves.notificacoes, [notificacao('n-1', { lida: true })]);
    jest.mocked(notificacoesApi.listar).mockResolvedValue([notificacao('n-2')]);
    await montar();
    mockConectar.mockReturnValue(false);
    mudancaDeEstado?.('active');
    await waitFor(() => expect(notificacoesApi.listar).toHaveBeenCalledWith(true));
  });

  it('ao autenticar, sincroniza as não lidas e mescla por id sem duplicar', async () => {
    queryClient.setQueryData(chaves.notificacoes, [notificacao('n-1', { lida: true }), notificacao('n-2')]);
    jest.mocked(notificacoesApi.listar).mockResolvedValue([notificacao('n-2'), notificacao('n-3')]);
    await montar();
    mockOpcoes?.aoAutenticar();
    await waitFor(() =>
      expect((queryClient.getQueryData(chaves.notificacoes) as Notificacao[]).map((n) => n.id).sort()).toEqual([
        'n-1',
        'n-2',
        'n-3',
      ]),
    );
  });
});

describe('receberNotificacao', () => {
  it('insere no cache, mostra o banner com o ticker e invalida os alertas', () => {
    queryClient.setQueryData(chaves.watchlist, [itemWatchlist]);
    queryClient.setQueryData(chaves.notificacoes, []);
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
    receberNotificacao(queryClient, notificacao('n-1'));
    expect((queryClient.getQueryData(chaves.notificacoes) as Notificacao[])[0].id).toBe('n-1');
    expect(useBanner.getState().atual?.notificacao.id).toBe('n-1');
    expect(useBanner.getState().atual?.ticker).toBe('PETR4');
    expect(invalidar).toHaveBeenCalledWith({ queryKey: chaves.alertas });
  });

  it('sinal ativado invalida os sinais do ativo', () => {
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
    receberNotificacao(queryClient, notificacao('n-1', { tipo: 'SINAL_ATIVADO' }));
    expect(invalidar).toHaveBeenCalledWith({ queryKey: chaves.sinais('a-1') });
  });

  it('a mesma notificação de novo não repete o banner nem duplica na caixa', () => {
    queryClient.setQueryData(chaves.notificacoes, []);
    receberNotificacao(queryClient, notificacao('n-1'));
    useBanner.getState().dispensar();
    receberNotificacao(queryClient, notificacao('n-1'));
    expect(useBanner.getState().atual).toBeNull();
    expect(queryClient.getQueryData(chaves.notificacoes)).toHaveLength(1);
  });

  it('notificação que já chegou pelo REST (sincronização) não gera banner', () => {
    queryClient.setQueryData(chaves.notificacoes, [notificacao('n-1')]);
    receberNotificacao(queryClient, notificacao('n-1'));
    expect(useBanner.getState().atual).toBeNull();
  });

  it('ativo fora da watchlist mostra o banner sem ticker', () => {
    receberNotificacao(queryClient, notificacao('n-1', { ativo_id: 'a-9' }));
    expect(useBanner.getState().atual?.ticker).toBeNull();
  });
});

describe('sincronizarNaoLidas', () => {
  it('falha de rede não derruba nada (o polling de reserva cobre)', async () => {
    queryClient.setQueryData(chaves.notificacoes, [notificacao('n-1')]);
    jest.mocked(notificacoesApi.listar).mockRejectedValue(new Error('sem rede'));
    await expect(sincronizarNaoLidas(queryClient)).resolves.toBeUndefined();
    expect(queryClient.getQueryData(chaves.notificacoes)).toHaveLength(1);
  });

  it('sem lista carregada ainda, pede a lista completa em vez de criar uma só com as não lidas', async () => {
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
    await sincronizarNaoLidas(queryClient);
    expect(notificacoesApi.listar).not.toHaveBeenCalled();
    expect(invalidar).toHaveBeenCalledWith({ queryKey: chaves.notificacoes });
  });
});
