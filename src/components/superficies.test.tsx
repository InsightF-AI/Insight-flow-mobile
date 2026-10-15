import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Botao } from '@/components/Botao';
import { Card } from '@/components/Card';
import { coresEscuro } from '@/theme/cores';

describe('Card', () => {
  it('sem cabeçalho renderiza só o conteúdo', async () => {
    await render(
      <Card>
        <Text>corpo</Text>
      </Card>,
    );
    expect(screen.getByText('corpo')).toBeOnTheScreen();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('com título mostra o cabeçalho (heading) e a ação', async () => {
    await render(
      <Card titulo="Resumo" acao={<Text>ação</Text>}>
        <Text>corpo</Text>
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Resumo' })).toBeOnTheScreen();
    expect(screen.getByText('ação')).toBeOnTheScreen();
  });

  it('com icone mostra o chip de ícone antes do título', async () => {
    await render(
      <Card titulo="Resumo" icone="carteira">
        <Text>corpo</Text>
      </Card>,
    );
    expect(screen.getByTestId('icone-carteira', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});

describe('Botao', () => {
  it('primário usa a cor primária de fundo', async () => {
    await render(<Botao titulo="Entrar" onPress={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Entrar' })).toHaveStyle({ backgroundColor: coresEscuro.primaria });
  });

  it('secundário é transparente com borda forte', async () => {
    await render(<Botao titulo="Tentar" variante="secundario" onPress={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Tentar' })).toHaveStyle({
      backgroundColor: 'transparent',
      borderColor: coresEscuro.bordaForte,
    });
  });

  it('perigo usa a cor negativa na borda', async () => {
    await render(<Botao titulo="Sair" variante="perigo" onPress={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Sair' })).toHaveStyle({ borderColor: coresEscuro.negativo });
  });

  it('desabilitado não dispara e fica com aria-disabled', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Botao titulo="Entrar" onPress={onPress} desabilitado />);
    const botao = screen.getByRole('button', { name: 'Entrar' });
    expect(botao).toBeDisabled();
    await user.press(botao);
    expect(onPress).not.toHaveBeenCalled();
  });
});
