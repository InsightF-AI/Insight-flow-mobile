import { render, screen } from '@testing-library/react-native';

import { AVISO_IA } from '@/dominio/regulatorio';

import Chat from '../../app/chat';

it('chat mostra o aviso de IA (RN-05) e fica desabilitado até a IA existir', async () => {
  await render(<Chat />);
  expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
  expect(screen.getByText('O chat com IA estará disponível em breve.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
});
