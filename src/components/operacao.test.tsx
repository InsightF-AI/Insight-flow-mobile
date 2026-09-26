import { render, screen, userEvent } from '@testing-library/react-native';

import { SugestoesTicker } from '@/components/SugestoesTicker';

it('SugestoesTicker oferece os tickers da watchlist como atalho', async () => {
  const user = userEvent.setup();
  const aoEscolher = jest.fn();
  await render(<SugestoesTicker tickers={['PETR4', 'VALE3']} aoEscolher={aoEscolher} />);
  await user.press(screen.getByRole('button', { name: 'Usar VALE3' }));
  expect(aoEscolher).toHaveBeenCalledWith('VALE3');
});

it('SugestoesTicker não renderiza nada sem tickers', async () => {
  await render(<SugestoesTicker tickers={[]} aoEscolher={jest.fn()} />);
  expect(screen.queryByRole('button')).not.toBeOnTheScreen();
});
