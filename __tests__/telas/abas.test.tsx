import { render } from '@testing-library/react-native';

import TabsLayout from '../../app/(tabs)/_layout';

const mockAbas: { name: string; options?: Record<string, unknown> }[] = [];

// `Tabs.Screen` só registra as opções: o que importa aqui é a configuração de cada aba.
jest.mock('expo-router', () => {
  const Tabs = ({ children }: { children?: unknown }) => children ?? null;
  Tabs.Screen = (props: { name: string; options?: Record<string, unknown> }) => {
    mockAbas.push(props);
    return null;
  };
  return { Tabs, router: { push: jest.fn() } };
});
jest.mock('@/hooks/useNotificacoes', () => ({ useNaoLidas: () => 0 }));

beforeEach(() => {
  mockAbas.length = 0;
});

it('são cinco abas, na ordem da decisão D5', async () => {
  await render(<TabsLayout />);
  expect(mockAbas.map((aba) => aba.name)).toEqual(['index', 'portfolio', 'chat', 'alertas', 'perfil']);
});

it('o teclado do chat não empurra a barra de abas para cima (Android)', async () => {
  await render(<TabsLayout />);
  expect(mockAbas.find((aba) => aba.name === 'chat')?.options?.tabBarHideOnKeyboard).toBe(true);
});
