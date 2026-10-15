import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

test('RNTL renderiza componentes nativos', async () => {
  await render(<Text>InsightFlow</Text>);
  expect(screen.getByText('InsightFlow')).toBeOnTheScreen();
});

test('testes rodam no fuso de São Paulo', () => {
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Sao_Paulo');
});
