import { render, screen, userEvent } from '@testing-library/react-native';

import type { Notificacao } from '@/api/tipos';
import { ItemNotificacao } from '@/components/ItemNotificacao';

const notificacao: Notificacao = {
  id: 'n-1',
  ativo_id: 'a-1',
  tipo: 'SINAL_ATIVADO',
  mensagem: 'Sobrevenda RSI ativado em PETR4',
  lida: false,
  criado_em: '2026-09-25T15:30:00Z',
};

it('não lida anuncia o estado e mostra tipo, ticker e data', async () => {
  await render(<ItemNotificacao notificacao={notificacao} ticker="PETR4" aoPressionar={jest.fn()} />);
  expect(
    screen.getByRole('button', { name: 'Não lida. Sinal técnico · PETR4. Sobrevenda RSI ativado em PETR4' }),
  ).toBeOnTheScreen();
  expect(screen.getByText('25/09/2026 12:30')).toBeOnTheScreen();
});

it('lida e sem ticker conhecido mostra só o tipo', async () => {
  const user = userEvent.setup();
  const aoPressionar = jest.fn();
  await render(
    <ItemNotificacao
      notificacao={{ ...notificacao, tipo: 'ALERTA_DISPARADO', lida: true }}
      ticker={null}
      aoPressionar={aoPressionar}
    />,
  );
  await user.press(screen.getByRole('button', { name: 'Alerta de preço. Sobrevenda RSI ativado em PETR4' }));
  expect(aoPressionar).toHaveBeenCalled();
});
