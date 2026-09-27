import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';

import { Campo } from '@/components/Campo';
import { coresEscuro } from '@/theme/cores';

function CampoDeSenha({ inicial = '' }: { inicial?: string }) {
  const [valor, setValor] = useState(inicial);
  return <Campo rotulo="Senha" valor={valor} aoMudar={setValor} secureTextEntry alternarSenha icone="cadeado" />;
}

describe('Campo (padrão do web)', () => {
  it('mostra o ícone à esquerda quando informado', async () => {
    await render(<Campo rotulo="E-mail" valor="" aoMudar={() => undefined} icone="email" />);
    expect(screen.getByTestId('icone-email', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('foco pinta a borda com a cor primária', async () => {
    await render(<Campo rotulo="E-mail" valor="" aoMudar={() => undefined} />);
    expect(screen.getByTestId('campo-moldura')).toHaveStyle({ borderColor: coresEscuro.bordaForte });
    await fireEvent(screen.getByLabelText('E-mail'), 'focus');
    expect(screen.getByTestId('campo-moldura')).toHaveStyle({ borderColor: coresEscuro.primaria });
    await fireEvent(screen.getByLabelText('E-mail'), 'blur');
    expect(screen.getByTestId('campo-moldura')).toHaveStyle({ borderColor: coresEscuro.bordaForte });
  });

  it('erro pinta a borda de negativo', async () => {
    await render(<Campo rotulo="E-mail" valor="" aoMudar={() => undefined} erro="Inválido" />);
    expect(screen.getByTestId('campo-moldura')).toHaveStyle({ borderColor: coresEscuro.negativo });
    expect(screen.getByText('Inválido')).toBeOnTheScreen();
  });

  it('alternarSenha mostra/oculta sem apagar o texto, e aria-pressed acompanha', async () => {
    const user = userEvent.setup();
    await render(<CampoDeSenha inicial="segredo123" />);
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);

    const botao = screen.getByRole('button', { name: 'Mostrar senha' });
    expect(botao.props['aria-pressed']).toBe(false);
    await user.press(botao);

    const campo = screen.getByLabelText('Senha');
    expect(campo.props.secureTextEntry).toBe(false);
    expect(campo.props.value).toBe('segredo123');
    expect(screen.getByRole('button', { name: 'Ocultar senha' }).props['aria-pressed']).toBe(true);

    await user.press(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);
    expect(screen.getByLabelText('Senha').props.value).toBe('segredo123');
  });

  it('sem alternarSenha não mostra o botão de olho', async () => {
    await render(<Campo rotulo="Senha" valor="" aoMudar={() => undefined} secureTextEntry />);
    expect(screen.queryByRole('button', { name: 'Mostrar senha' })).toBeNull();
  });
});
