import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { createRef, useState } from 'react';
import type { TextInput } from 'react-native';

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

  it('o botão do olho tem alvo de toque de pelo menos 44 pt sem depender de hitSlop', async () => {
    await render(<CampoDeSenha />);
    const botao = screen.getByRole('button', { name: 'Mostrar senha' });
    expect(botao).toHaveStyle({ minWidth: 44, minHeight: 44 });
    expect(botao.props.hitSlop).toBeUndefined();
  });

  it('sem alternarSenha não mostra o botão de olho', async () => {
    await render(<Campo rotulo="Senha" valor="" aoMudar={() => undefined} secureTextEntry />);
    expect(screen.queryByRole('button', { name: 'Mostrar senha' })).toBeNull();
  });
});

describe('Campo (acessibilidade e teclado)', () => {
  it('o erro vira a dica do campo para o leitor de tela', async () => {
    const { rerender } = await render(<Campo rotulo="E-mail" valor="" aoMudar={() => undefined} />);
    expect(screen.getByLabelText('E-mail').props.accessibilityHint).toBeUndefined();
    await rerender(<Campo rotulo="E-mail" valor="" aoMudar={() => undefined} erro="E-mail inválido" />);
    expect(screen.getByLabelText('E-mail').props.accessibilityHint).toBe('E-mail inválido');
  });

  it('corretor desligado em e-mail e senha, ligado no texto comum, e o formulário pode forçar', async () => {
    await render(
      <>
        <Campo rotulo="E-mail" valor="" aoMudar={() => undefined} keyboardType="email-address" />
        <Campo rotulo="Senha" valor="" aoMudar={() => undefined} secureTextEntry />
        <Campo rotulo="Nome" valor="" aoMudar={() => undefined} />
        <Campo rotulo="Ticker" valor="" aoMudar={() => undefined} autoCorrect={false} />
      </>,
    );
    expect(screen.getByLabelText('E-mail').props.autoCorrect).toBe(false);
    expect(screen.getByLabelText('Senha').props.autoCorrect).toBe(false);
    expect(screen.getByLabelText('Nome').props.autoCorrect).toBe(true);
    expect(screen.getByLabelText('Ticker').props.autoCorrect).toBe(false);
  });

  it('repassa a tecla do teclado e o envio, e expõe o campo pela ref', async () => {
    const aoEnviar = jest.fn();
    const ref = createRef<TextInput>();
    await render(
      <Campo ref={ref} rotulo="Senha" valor="" aoMudar={() => undefined} returnKeyType="go" onSubmitEditing={aoEnviar} />,
    );
    const campo = screen.getByLabelText('Senha');
    expect(campo.props.returnKeyType).toBe('go');
    await fireEvent(campo, 'submitEditing');
    expect(aoEnviar).toHaveBeenCalledTimes(1);
    expect(typeof ref.current?.focus).toBe('function');
  });
});
