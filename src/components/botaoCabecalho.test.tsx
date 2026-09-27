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
