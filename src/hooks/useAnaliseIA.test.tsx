import { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/api/client';
import { iaApi } from '@/api/ia';
import type { AnaliseIA } from '@/api/tipos';
import { useAnaliseIA } from '@/hooks/useAnaliseIA';
import { criarProvedor } from '@/test/renderizar';

jest.mock('@/api/ia', () => ({ iaApi: { analisar: jest.fn(), conversar: jest.fn() } }));

const analise: AnaliseIA = {
  ativo_id: 'a-1',
  texto: 'O RSI(14) está em 28,4.',
  gerado_em: '2026-10-11T15:30:00Z',
  modelo: 'gemini-3.5-flash',
  em_cache: false,
  desatualizada: false,
  aviso_legal: 'Análise gerada por IA. Não constitui recomendação de investimento.',
};

// Padrões do app em produção: repetição de 5xx ligada. A IA não pode repetir sozinha (cada chamada gasta cota).
function clienteComRepeticao() {
  // gcTime infinito: o padrão (5 min) deixa um timer aberto e o Jest não encerra o processo.
  return new QueryClient({ defaultOptions: { queries: { retry: 3, retryDelay: 1, gcTime: Infinity } } });
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('abrir o ativo não pede a análise (cota do provedor)', async () => {
  await renderHook(() => useAnaliseIA('a-1'), { wrapper: criarProvedor(clienteComRepeticao()) });
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 20));
  });
  expect(iaApi.analisar).not.toHaveBeenCalled();
});

it('gerar pede a análise uma vez e expõe o resultado', async () => {
  jest.mocked(iaApi.analisar).mockResolvedValue(analise);
  const { result } = await renderHook(() => useAnaliseIA('a-1'), { wrapper: criarProvedor(clienteComRepeticao()) });

  await act(async () => {
    result.current.gerar();
  });

  await waitFor(() => expect(result.current.analise).toEqual(analise));
  expect(iaApi.analisar).toHaveBeenCalledTimes(1);
  expect(iaApi.analisar).toHaveBeenCalledWith('a-1');
  expect(result.current.gerando).toBe(false);
});

it('gerar de novo atualiza a análise', async () => {
  jest.mocked(iaApi.analisar).mockResolvedValueOnce(analise).mockResolvedValueOnce({ ...analise, texto: 'Texto novo.' });
  const { result } = await renderHook(() => useAnaliseIA('a-1'), { wrapper: criarProvedor(clienteComRepeticao()) });

  await act(async () => {
    result.current.gerar();
  });
  await waitFor(() => expect(result.current.analise?.texto).toBe(analise.texto));
  await act(async () => {
    result.current.gerar();
  });

  await waitFor(() => expect(result.current.analise?.texto).toBe('Texto novo.'));
  expect(iaApi.analisar).toHaveBeenCalledTimes(2);
});

it('falha do servidor não é repetida sozinha', async () => {
  jest.mocked(iaApi.analisar).mockRejectedValue(new ApiError(503, 'Provedor de IA indisponivel'));
  const { result } = await renderHook(() => useAnaliseIA('a-1'), { wrapper: criarProvedor(clienteComRepeticao()) });

  await act(async () => {
    result.current.gerar();
  });

  await waitFor(() => expect(result.current.erro).toBeInstanceOf(ApiError));
  await act(async () => {
    await new Promise((resolver) => setTimeout(resolver, 50));
  });
  expect(iaApi.analisar).toHaveBeenCalledTimes(1);
});

it('voltar à tela mostra a análise do cache sem nova chamada', async () => {
  jest.mocked(iaApi.analisar).mockResolvedValue(analise);
  const cliente = clienteComRepeticao();
  const primeira = await renderHook(() => useAnaliseIA('a-1'), { wrapper: criarProvedor(cliente) });
  await act(async () => {
    primeira.result.current.gerar();
  });
  await waitFor(() => expect(primeira.result.current.analise).toEqual(analise));
  await primeira.unmount();

  const segunda = await renderHook(() => useAnaliseIA('a-1'), { wrapper: criarProvedor(cliente) });

  expect(segunda.result.current.analise).toEqual(analise);
  expect(iaApi.analisar).toHaveBeenCalledTimes(1);
});
