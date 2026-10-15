import { render, screen, userEvent } from '@testing-library/react-native';

import { BotaoCabecalho } from '@/components/BotaoCabecalho';

describe('BotaoCabecalho', () => {
  it('dispara onPress pelo nome acessível', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<BotaoCabecalho icone="lixeira" rotulo="Remover" onPress={onPress} />);
    await user.press(screen.getByRole('button', { name: 'Remover' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('tem alvo de toque de pelo menos 44 pt sem depender de hitSlop', async () => {
    await render(<BotaoCabecalho icone="lixeira" rotulo="Remover" onPress={jest.fn()} />);
    const botao = screen.getByRole('button', { name: 'Remover' });
    expect(botao).toHaveStyle({ minWidth: 44, minHeight: 44 });
    expect(botao.props.hitSlop).toBeUndefined();
  });
});

it('mostra o selo de não lidas e o inclui no nome acessível', async () => {
  await render(<BotaoCabecalho icone="sino" rotulo="Notificações" selo={3} onPress={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Notificações, 3 não lidas' })).toBeOnTheScreen();
  expect(screen.getByText('3')).toBeOnTheScreen();
});

it('selo zero ou ausente não aparece e muitos viram 99+', async () => {
  const { rerender } = await render(<BotaoCabecalho icone="sino" rotulo="Notificações" selo={0} onPress={jest.fn()} />);
  expect(screen.queryByText('0')).not.toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Notificações' })).toBeOnTheScreen();
  await rerender(<BotaoCabecalho icone="sino" rotulo="Notificações" selo={150} onPress={jest.fn()} />);
  expect(screen.getByText('99+')).toBeOnTheScreen();
});
