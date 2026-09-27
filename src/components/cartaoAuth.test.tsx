import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { CartaoAuth } from '@/components/CartaoAuth';

describe('CartaoAuth', () => {
  it('mostra marca, título, subtítulo, conteúdo e rodapé', async () => {
    await render(
      <CartaoAuth titulo="Entrar" subtitulo="Acesse sua conta" rodape={<Text>rodapé</Text>}>
        <Text>conteúdo</Text>
      </CartaoAuth>,
    );
    expect(screen.getByText('InsightFlow')).toBeOnTheScreen();
    expect(screen.getByText('Análise de ativos · B3 & Cripto')).toBeOnTheScreen();
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeOnTheScreen();
    expect(screen.getByText('Acesse sua conta')).toBeOnTheScreen();
    expect(screen.getByText('conteúdo')).toBeOnTheScreen();
    expect(screen.getByText('rodapé')).toBeOnTheScreen();
  });
});
