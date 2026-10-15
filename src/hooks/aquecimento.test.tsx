import { renderHook, waitFor } from '@testing-library/react-native';

import { ativosApi } from '@/api/ativos';
import { useHistorico } from '@/hooks/useAtivo';
import { criarProvedor } from '@/test/renderizar';

jest.mock('@/api/ativos', () => ({ ativosApi: { historico: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(ativosApi.historico).mockResolvedValue([]);
});

it('por padrão busca o histórico', async () => {
  const { result } = await renderHook(() => useHistorico('a-1', '1M'), { wrapper: criarProvedor() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(ativosApi.historico).toHaveBeenCalledWith('a-1', '1M');
});

it('habilitado: false não faz a chamada', async () => {
  const { result } = await renderHook(() => useHistorico('a-1', '5A', { habilitado: false }), {
    wrapper: criarProvedor(),
  });
  expect(result.current.fetchStatus).toBe('idle');
  expect(ativosApi.historico).not.toHaveBeenCalled();
});
