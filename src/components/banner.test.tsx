import { render, screen, userEvent } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { BannerNotificacao } from '@/components/BannerNotificacao';

describe('BannerNotificacao', () => {
  it('anuncia o aviso para leitores de tela e abre ao toque', async () => {
    const user = userEvent.setup();
    const anunciar = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    const aoPressionar = jest.fn();
    await render(
      <BannerNotificacao
        titulo="Alerta de preço · PETR4"
        mensagem="PETR4 atingiu R$ 40,00"
        aoPressionar={aoPressionar}
        aoDispensar={jest.fn()}
      />,
    );
    expect(anunciar).toHaveBeenCalledWith('Alerta de preço · PETR4. PETR4 atingiu R$ 40,00');
    expect(screen.getByText('Alerta de preço · PETR4')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Abrir: Alerta de preço · PETR4. PETR4 atingiu R$ 40,00' }));
    expect(aoPressionar).toHaveBeenCalledTimes(1);
  });

  it('tem botão para dispensar sem abrir', async () => {
    const user = userEvent.setup();
    const aoPressionar = jest.fn();
    const aoDispensar = jest.fn();
    await render(<BannerNotificacao titulo="T" mensagem="M" aoPressionar={aoPressionar} aoDispensar={aoDispensar} />);
    await user.press(screen.getByRole('button', { name: 'Dispensar aviso' }));
    expect(aoDispensar).toHaveBeenCalledTimes(1);
    expect(aoPressionar).not.toHaveBeenCalled();
  });
});
