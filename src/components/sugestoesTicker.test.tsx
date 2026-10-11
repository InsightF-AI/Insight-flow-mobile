import { render, screen, userEvent } from '@testing-library/react-native';

import { SugestoesTicker } from '@/components/SugestoesTicker';

describe('SugestoesTicker', () => {
  it('toque no chip devolve o ticker', async () => {
    const aoEscolher = jest.fn();
    const user = userEvent.setup();
    await render(<SugestoesTicker tickers={['PETR4', 'VALE3']} aoEscolher={aoEscolher} />);

    await user.press(screen.getByRole('button', { name: 'Usar VALE3' }));

    expect(aoEscolher).toHaveBeenCalledWith('VALE3');
  });

  it('sem tickers não mostra nada', async () => {
    await render(<SugestoesTicker tickers={[]} aoEscolher={jest.fn()} />);
    expect(screen.queryByTestId('sugestoes-ticker')).not.toBeOnTheScreen();
  });

  // Achado da prévia web: o ScrollView horizontal vem com `flexGrow: 1` e, num formulário curto dentro de um conteúdo
  // que ocupa a tela toda (`Tela`), cresce na vertical e estica os chips (pílulas de ~230 pt).
  it('a lista horizontal não cresce na vertical', async () => {
    await render(<SugestoesTicker tickers={['PETR4']} aoEscolher={jest.fn()} />);
    expect(screen.getByTestId('sugestoes-ticker')).toHaveStyle({ flexGrow: 0 });
  });
});
