import { render, screen } from '@testing-library/react-native';

import { ConfiguracaoInvalida } from '@/components/ConfiguracaoInvalida';

it('explica o problema e como corrigir', async () => {
  await render(<ConfiguracaoInvalida mensagem="EXPO_PUBLIC_API_URL precisa ser só a raiz do servidor" />);
  expect(screen.getByRole('heading', { name: 'Endereço do servidor inválido' })).toBeOnTheScreen();
  expect(screen.getByRole('alert')).toHaveTextContent('EXPO_PUBLIC_API_URL precisa ser só a raiz do servidor');
  expect(screen.getByText('Corrija o arquivo .env do app e reinicie o Metro com "npx expo start -c".')).toBeOnTheScreen();
});
