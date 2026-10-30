import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';

import { MensagemErro } from '@/components/MensagemErro';

describe('MensagemErro', () => {
  const plataforma = Platform.OS;
  let anunciar: jest.SpyInstance;

  beforeEach(() => {
    anunciar = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  });

  afterEach(() => {
    anunciar.mockRestore();
    Platform.OS = plataforma;
  });

  it('sem mensagem não mostra nada nem anuncia', async () => {
    await render(<MensagemErro mensagem={null} />);
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    expect(anunciar).not.toHaveBeenCalled();
  });

  it('mostra como alerta, com região viva para o TalkBack', async () => {
    Platform.OS = 'android';
    await render(<MensagemErro mensagem="Sem conexão com o servidor" />);
    const alerta = screen.getByRole('alert');
    expect(alerta).toHaveTextContent('Sem conexão com o servidor');
    expect(alerta.props.accessibilityLiveRegion).toBe('polite');
    expect(anunciar).not.toHaveBeenCalled();
  });

  it('no iOS anuncia ao VoiceOver quando a mensagem aparece ou muda', async () => {
    Platform.OS = 'ios';
    const { rerender } = await render(<MensagemErro mensagem="Primeiro erro" />);
    expect(anunciar).toHaveBeenLastCalledWith('Primeiro erro');
    await rerender(<MensagemErro mensagem="Segundo erro" />);
    expect(anunciar).toHaveBeenLastCalledWith('Segundo erro');
    expect(anunciar).toHaveBeenCalledTimes(2);
  });
});
