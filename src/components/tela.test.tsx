import { screen } from '@testing-library/react-native';
import { HeaderHeightContext } from 'expo-router/react-navigation';

import { Tela } from '@/components/Tela';
import { Texto } from '@/components/Texto';
import { renderizar } from '@/test/renderizar';

// O KeyboardAvoidingView falso expõe o deslocamento recebido (o real calcula tudo por layout nativo).
jest.mock('react-native/Libraries/Components/Keyboard/KeyboardAvoidingView', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: ({ children, keyboardVerticalOffset }: { children?: unknown; keyboardVerticalOffset?: number }) => (
      <View testID="teclado" aria-label={`deslocamento ${keyboardVerticalOffset}`}>
        {children as never}
      </View>
    ),
  };
});

describe('Tela', () => {
  // Achado da revisão do chat: sob um cabeçalho, o teclado do iOS cobre o fim do formulário sem este deslocamento.
  it('desloca o teclado pela altura do cabeçalho da tela', async () => {
    await renderizar(
      <HeaderHeightContext.Provider value={91}>
        <Tela>
          <Texto>Formulário</Texto>
        </Tela>
      </HeaderHeightContext.Provider>,
    );
    expect(screen.getByLabelText('deslocamento 91')).toBeOnTheScreen();
  });

  it('sem cabeçalho (login e cadastro) o deslocamento é zero', async () => {
    await renderizar(
      <Tela areaSegura>
        <Texto>Entrar</Texto>
      </Tela>,
    );
    expect(screen.getByLabelText('deslocamento 0')).toBeOnTheScreen();
  });
});
