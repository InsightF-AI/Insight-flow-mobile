import { renderHook } from '@testing-library/react-native';

import { useBannerNotificacao } from '@/hooks/useBannerNotificacao';
import { useSincronizarPush, useToquesDoPush } from '@/hooks/usePush';
import { useSessaoAtiva } from '@/hooks/useSessaoAtiva';
import { useTempoReal } from '@/hooks/useTempoReal';

jest.mock('@/hooks/useTempoReal', () => ({ useTempoReal: jest.fn() }));
jest.mock('@/hooks/usePush', () => ({ useSincronizarPush: jest.fn(), useToquesDoPush: jest.fn() }));
jest.mock('@/hooks/useBannerNotificacao', () => ({
  useBannerNotificacao: jest.fn(() => ({ banner: null, aoPressionar: jest.fn(), aoDispensar: jest.fn() })),
}));

it('liga o tempo real, o registro do push e os toques à sessão ativa e devolve o banner', async () => {
  const banner = { titulo: 'Alerta de preço · PETR4', mensagem: 'PETR4 atingiu o alvo' };
  const aoPressionar = jest.fn();
  const aoDispensar = jest.fn();
  jest.mocked(useBannerNotificacao).mockReturnValue({ banner, aoPressionar, aoDispensar });

  const { result } = await renderHook(() => useSessaoAtiva('ws://servidor/api/v1/notificacoes/ws'));

  expect(useTempoReal).toHaveBeenCalledWith('ws://servidor/api/v1/notificacoes/ws');
  expect(useSincronizarPush).toHaveBeenCalled();
  expect(useToquesDoPush).toHaveBeenCalled();
  expect(result.current).toEqual({ banner, aoPressionar, aoDispensar });
});
