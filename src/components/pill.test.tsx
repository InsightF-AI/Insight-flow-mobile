import { render, screen } from '@testing-library/react-native';

import { Pill, type TomPill } from '@/components/Pill';
import { VariacaoBadge } from '@/components/VariacaoBadge';
import { coresEscuro, tonsEscuro } from '@/theme/cores';

const CASOS: [TomPill, string, string][] = [
  ['verde', tonsEscuro.verdeFundo, coresEscuro.positivo],
  ['vermelho', tonsEscuro.vermelhoFundo, coresEscuro.negativo],
  ['amarelo', tonsEscuro.amareloFundo, coresEscuro.alerta],
  ['laranja', tonsEscuro.laranjaFundo, tonsEscuro.laranjaTexto],
  ['azul', tonsEscuro.azulFundo, coresEscuro.primaria],
  ['violeta', tonsEscuro.violetaFundo, coresEscuro.ia],
  ['cinza', coresEscuro.superficieAlta, coresEscuro.textoSecundario],
];

describe('Pill', () => {
  it.each(CASOS)('tom %s usa o fundo e o texto do tema', async (tom, fundo, texto) => {
    await render(
      <Pill tom={tom} aria-label={`pill ${tom}`}>
        Rótulo
      </Pill>,
    );
    expect(screen.getByLabelText(`pill ${tom}`)).toHaveStyle({ backgroundColor: fundo });
    expect(screen.getByText('Rótulo')).toHaveStyle({ color: texto });
  });

  it('mostra o ícone quando informado', async () => {
    await render(<Pill icone="sino">Alerta</Pill>);
    expect(screen.getByTestId('icone-sino', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});

describe('VariacaoBadge como Pill', () => {
  it('alta usa o tom verde e mantém aria-label', async () => {
    await render(<VariacaoBadge valor="1.23" escala="pontos" />);
    expect(screen.getByLabelText('Variação +1,23%')).toHaveStyle({ backgroundColor: tonsEscuro.verdeFundo });
  });

  it('baixa usa o tom vermelho', async () => {
    await render(<VariacaoBadge valor="-0.025" escala="fracao" />);
    expect(screen.getByLabelText('Variação -2,50%')).toHaveStyle({ backgroundColor: tonsEscuro.vermelhoFundo });
  });

  it('zero usa o tom cinza', async () => {
    await render(<VariacaoBadge valor="0" escala="pontos" />);
    expect(screen.getByLabelText('Variação 0,00%')).toHaveStyle({ backgroundColor: coresEscuro.superficieAlta });
  });
});
