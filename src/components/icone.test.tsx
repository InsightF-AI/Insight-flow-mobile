import { render, screen } from '@testing-library/react-native';

import { Icone, NOMES_DE_ICONES } from '@/components/Icone';
import { IconeChip } from '@/components/IconeChip';

// O ícone é aria-hidden, então as queries precisam incluir elementos ocultos.
const incluirOcultos = { includeHiddenElements: true };

describe('Icone', () => {
  it.each(NOMES_DE_ICONES)('renderiza o ícone %s (componente lucide existe na versão instalada)', async (nome) => {
    await render(<Icone nome={nome} />);
    expect(screen.getByTestId(`icone-${nome}`, incluirOcultos)).toBeOnTheScreen();
  });

  it('é decorativo para leitores de tela', async () => {
    await render(<Icone nome="lixeira" />);
    expect(screen.getByTestId('icone-lixeira', incluirOcultos).props['aria-hidden']).toBe(true);
    expect(screen.queryByTestId('icone-lixeira')).not.toBeOnTheScreen();
  });
});

describe('IconeChip', () => {
  it('renderiza o ícone dentro do chip', async () => {
    await render(<IconeChip nome="carteira" tom="positivo" />);
    expect(screen.getByTestId('icone-carteira', incluirOcultos)).toBeOnTheScreen();
  });
});
