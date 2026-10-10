import { render, screen, userEvent } from '@testing-library/react-native';

import { ApiError } from '@/api/client';
import { AvisoIA } from '@/components/AvisoIA';
import { Icone } from '@/components/Icone';
import { ItemSinalAtivo } from '@/components/ItemSinalAtivo';
import { Kpi } from '@/components/Kpi';
import { ResumoDiarioCard } from '@/components/ResumoDiarioCard';
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

describe('ResumoDiarioCard', () => {
  const resumo = {
    texto: 'A carteira variou +1,00% no dia.',
    avisoLegal: 'Aviso do servidor.',
    geradoEm: '2026-10-09T21:30:00Z',
  };

  it('com resumo mostra texto, data e SEMPRE o aviso legal', async () => {
    await render(<ResumoDiarioCard estado="ok" resumo={resumo} aoTentarNovamente={jest.fn()} />);
    expect(screen.getByText('A carteira variou +1,00% no dia.')).toBeOnTheScreen();
    expect(screen.getByText('Gerado em 09/10/2026 18:30')).toBeOnTheScreen();
    expect(screen.getByText('Aviso do servidor.')).toBeOnTheScreen();
  });

  it('sem resumo explica quando ele é gerado e não mostra aviso de IA', async () => {
    await render(<ResumoDiarioCard estado="ok" resumo={null} aoTentarNovamente={jest.fn()} />);
    expect(screen.getByText(/Nenhum resumo gerado ainda/)).toBeOnTheScreen();
    expect(screen.queryByText(AVISO_IA)).not.toBeOnTheScreen();
  });

  it('carregando mostra esqueletos', async () => {
    await render(<ResumoDiarioCard estado="carregando" resumo={null} aoTentarNovamente={jest.fn()} />);
    expect(screen.getAllByLabelText('Carregando').length).toBeGreaterThan(0);
  });

  it('erro mostra mensagem e permite tentar de novo', async () => {
    const user = userEvent.setup();
    const tentar = jest.fn();
    await render(
      <ResumoDiarioCard estado="erro" erro={new ApiError(500, 'Erro 500')} resumo={null} aoTentarNovamente={tentar} />,
    );
    expect(screen.getByText('Resumo diário indisponível no momento.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(tentar).toHaveBeenCalledTimes(1);
  });
});

describe('ItemSinalAtivo', () => {
  const base = { ticker: 'PETR4', regraNome: 'Sobrevenda RSI', ativadoEm: '2026-10-09T13:00:00Z' };

  it('mostra ticker, regra, data e o histórico da condição', async () => {
    await render(
      <ItemSinalAtivo {...base} backtest="14 ocorrências em 24 meses" carregandoBacktest={false} aoPressionar={jest.fn()} />,
    );
    expect(screen.getByText('PETR4')).toBeOnTheScreen();
    expect(screen.getByText('Sobrevenda RSI')).toBeOnTheScreen();
    expect(screen.getByText('Ativo desde 09/10/2026 10:00')).toBeOnTheScreen();
    expect(screen.getByText('14 ocorrências em 24 meses')).toBeOnTheScreen();
  });

  it('sem histórico mostra "indisponível" e carregando mostra esqueleto', async () => {
    const { rerender } = await render(<ItemSinalAtivo {...base} carregandoBacktest={false} aoPressionar={jest.fn()} />);
    expect(screen.getByText('Histórico indisponível no momento')).toBeOnTheScreen();
    await rerender(<ItemSinalAtivo {...base} carregandoBacktest aoPressionar={jest.fn()} />);
    expect(screen.getByLabelText('Carregando')).toBeOnTheScreen();
  });

  it('é pressionável pelo nome acessível', async () => {
    const user = userEvent.setup();
    const aoPressionar = jest.fn();
    await render(<ItemSinalAtivo {...base} carregandoBacktest={false} aoPressionar={aoPressionar} />);
    await user.press(screen.getByRole('button', { name: 'PETR4, Sobrevenda RSI' }));
    expect(aoPressionar).toHaveBeenCalledTimes(1);
  });
});
