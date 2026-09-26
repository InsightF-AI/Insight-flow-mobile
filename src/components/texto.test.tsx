import { render, screen } from '@testing-library/react-native';

import { Texto } from '@/components/Texto';
import { coresEscuro } from '@/theme/cores';
import { familia } from '@/theme/familias';

describe('Texto', () => {
  it('título usa Space Grotesk Bold', async () => {
    await render(<Texto variante="titulo">Olá</Texto>);
    expect(screen.getByText('Olá')).toHaveStyle({ fontFamily: familia.titulo, fontSize: 22 });
  });

  it('corpo usa Inter Regular e, com negrito, Inter Bold (sem fontWeight)', async () => {
    await render(
      <>
        <Texto>normal</Texto>
        <Texto negrito>forte</Texto>
      </>,
    );
    expect(screen.getByText('normal')).toHaveStyle({ fontFamily: familia.corpo });
    expect(screen.getByText('forte')).toHaveStyle({ fontFamily: familia.negrito });
    expect(screen.getByText('forte')).not.toHaveStyle({ fontWeight: '700' });
  });

  it('rótulo é caixa alta com espaçamento entre letras', async () => {
    await render(<Texto variante="rotulo">E-mail</Texto>);
    expect(screen.getByText('E-mail')).toHaveStyle({ textTransform: 'uppercase', letterSpacing: 0.8 });
  });

  it('numerico ativa algarismos tabulares', async () => {
    await render(<Texto numerico>R$ 10,00</Texto>);
    expect(screen.getByText('R$ 10,00')).toHaveStyle({ fontVariant: ['tabular-nums'] });
  });

  it('cores terciario, destaque e ia vêm do tema', async () => {
    await render(
      <>
        <Texto cor="terciario">a</Texto>
        <Texto cor="destaque">b</Texto>
        <Texto cor="ia">c</Texto>
      </>,
    );
    expect(screen.getByText('a')).toHaveStyle({ color: coresEscuro.textoTerciario });
    expect(screen.getByText('b')).toHaveStyle({ color: coresEscuro.destaque });
    expect(screen.getByText('c')).toHaveStyle({ color: coresEscuro.ia });
  });
});
