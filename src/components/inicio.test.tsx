import { render, screen } from '@testing-library/react-native';

import { AvisoIA } from '@/components/AvisoIA';
import { Icone } from '@/components/Icone';
import { Kpi } from '@/components/Kpi';
import { Skeleton } from '@/components/Skeleton';
import { AVISO_IA } from '@/dominio/regulatorio';

const incluirOcultos = { includeHiddenElements: true };

describe('Skeleton', () => {
  it('anuncia o carregamento para leitores de tela', async () => {
    await render(<Skeleton />);
    expect(screen.getByLabelText('Carregando')).toBeOnTheScreen();
  });
});

describe('Kpi', () => {
  it('mostra rótulo, valor e dica', async () => {
    await render(<Kpi rotulo="Patrimônio simulado" valor="R$ 4.000,00" dica="Custo R$ 3.750,00" icone="carteira" />);
    expect(screen.getByText('Patrimônio simulado')).toBeOnTheScreen();
    expect(screen.getByText('R$ 4.000,00')).toBeOnTheScreen();
    expect(screen.getByText('Custo R$ 3.750,00')).toBeOnTheScreen();
  });

  it('carregando troca valor e dica por esqueletos e não mostra o valor', async () => {
    await render(<Kpi rotulo="Patrimônio simulado" valor="R$ 4.000,00" dica="Custo" icone="carteira" carregando />);
    expect(screen.getByText('Patrimônio simulado')).toBeOnTheScreen();
    expect(screen.queryByText('R$ 4.000,00')).not.toBeOnTheScreen();
    expect(screen.getAllByLabelText('Carregando')).toHaveLength(2);
  });

  it('sem dica não reserva linha', async () => {
    await render(<Kpi rotulo="Sinais ativos" valor="3" icone="atividade" />);
    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Carregando')).not.toBeOnTheScreen();
  });
});

describe('Icone casa', () => {
  it('existe na versão instalada do lucide', async () => {
    await render(<Icone nome="casa" />);
    expect(screen.getByTestId('icone-casa', incluirOcultos)).toBeOnTheScreen();
  });
});

describe('AvisoIA', () => {
  it('sem texto usa o aviso legal padrão', async () => {
    await render(<AvisoIA />);
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
  });

  it('usa o texto do servidor quando informado', async () => {
    await render(<AvisoIA texto="Aviso do servidor." />);
    expect(screen.getByText('Aviso do servidor.')).toBeOnTheScreen();
    expect(screen.queryByText(AVISO_IA)).not.toBeOnTheScreen();
  });
});
