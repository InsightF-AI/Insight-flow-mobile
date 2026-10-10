import { renderHook, waitFor } from '@testing-library/react-native';

import { ativosApi } from '@/api/ativos';
import type { ResultadoBacktest, Sinal } from '@/api/tipos';
import { chaves } from '@/hooks/chaves';
import { useBacktestsDosSinais, useSinaisDosAtivos } from '@/hooks/useAtivo';
import { criarProvedor, criarQueryClientDeTeste } from '@/test/renderizar';

jest.mock('@/api/ativos', () => ({ ativosApi: { sinais: jest.fn(), backtest: jest.fn() } }));

const sinal: Sinal = {
  id: 's-1',
  ativo_id: 'a-1',
  regra_id: 'r-1',
  regra_nome: 'Sobrevenda RSI',
  regra_descricao: 'RSI(14) abaixo de 30',
  data_ativacao: '2026-10-09T13:00:00Z',
  contexto: { valor: '28.4' },
  data_desativacao: null,
};

const backtest: ResultadoBacktest = {
  regra_id: 'r-1',
  ativo_id: 'a-1',
  total_ocorrencias: 14,
  retorno_medio_5_pregoes: '1.8',
  retorno_medio_20_pregoes: '3.2',
  retorno_medio_60_pregoes: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

it('useSinaisDosAtivos busca um ativo por vez e falha em separado', async () => {
  jest.mocked(ativosApi.sinais).mockImplementation(async (ativoId: string) => {
    if (ativoId === 'a-2') throw new Error('falhou');
    return [sinal];
  });
  const { result } = await renderHook(() => useSinaisDosAtivos(['a-1', 'a-2']), { wrapper: criarProvedor() });
  await waitFor(() => expect(result.current.every((consulta) => !consulta.isPending)).toBe(true));
  expect(result.current[0].data).toEqual([sinal]);
  expect(result.current[1].isError).toBe(true);
  expect(ativosApi.sinais).toHaveBeenCalledTimes(2);
});

it('useSinaisDosAtivos usa a chave do detalhe do ativo (cache compartilhado)', async () => {
  jest.mocked(ativosApi.sinais).mockResolvedValue([sinal]);
  const queryClient = criarQueryClientDeTeste();
  const { result } = await renderHook(() => useSinaisDosAtivos(['a-1']), { wrapper: criarProvedor(queryClient) });
  await waitFor(() => expect(result.current[0].isSuccess).toBe(true));
  expect(queryClient.getQueryData(chaves.sinais('a-1'))).toEqual([sinal]);
});

it('useBacktestsDosSinais busca por par ativo+regra com a chave do detalhe', async () => {
  jest.mocked(ativosApi.backtest).mockResolvedValue(backtest);
  const queryClient = criarQueryClientDeTeste();
  const { result } = await renderHook(() => useBacktestsDosSinais([{ ativoId: 'a-1', regraId: 'r-1' }]), {
    wrapper: criarProvedor(queryClient),
  });
  await waitFor(() => expect(result.current[0].isSuccess).toBe(true));
  expect(ativosApi.backtest).toHaveBeenCalledWith('a-1', 'r-1');
  expect(queryClient.getQueryData(chaves.backtest('a-1', 'r-1'))).toEqual(backtest);
});

it('sem ativos não faz nenhuma chamada', async () => {
  const { result } = await renderHook(() => useSinaisDosAtivos([]), { wrapper: criarProvedor() });
  expect(result.current).toEqual([]);
  expect(ativosApi.sinais).not.toHaveBeenCalled();
});
