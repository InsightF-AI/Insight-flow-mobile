import { render, screen } from '@testing-library/react-native';

import type { ResultadoBacktest, Sinal } from '@/api/tipos';
import { AvisoIA } from '@/components/AvisoIA';
import { CardAnaliseIA } from '@/components/CardAnaliseIA';
import { IndicadorItem } from '@/components/IndicadorItem';
import { SinalCard } from '@/components/SinalCard';
import { VariacaoBadge } from '@/components/VariacaoBadge';
import { AVISO_IA } from '@/dominio/regulatorio';
import { coresClaro } from '@/theme/cores';

describe('VariacaoBadge', () => {
  it('alta mostra seta para cima em verde', async () => {
    await render(<VariacaoBadge valor="1.23" escala="pontos" />);
    expect(screen.getByText('▲ +1,23%')).toHaveStyle({ color: coresClaro.positivo });
  });

  it('baixa mostra seta para baixo em vermelho', async () => {
    await render(<VariacaoBadge valor="-0.025" escala="fracao" />);
    expect(screen.getByText('▼ -2,50%')).toHaveStyle({ color: coresClaro.negativo });
  });

  it('zero é neutro', async () => {
    await render(<VariacaoBadge valor="0" escala="pontos" />);
    expect(screen.getByText('• 0,00%')).toHaveStyle({ color: coresClaro.textoSecundario });
  });
});

describe('aviso de IA (RN-05)', () => {
  it('AvisoIA mostra o texto exato', async () => {
    await render(<AvisoIA />);
    expect(screen.getByText('Análise gerada por IA. Não constitui recomendação de investimento.')).toBeOnTheScreen();
  });

  it('CardAnaliseIA sempre traz o aviso', async () => {
    await render(<CardAnaliseIA />);
    expect(screen.getByText('Análise textual por IA — disponível em breve.')).toBeOnTheScreen();
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
  });
});

it('IndicadorItem mostra título, valor e descrição', async () => {
  await render(
    <IndicadorItem indicador={{ chave: 'RSI-14', titulo: 'RSI 14', valor: '28,4', descricao: 'Zona de sobrevenda (abaixo de 30)' }} />,
  );
  expect(screen.getByText('RSI 14')).toBeOnTheScreen();
  expect(screen.getByText('28,4')).toBeOnTheScreen();
  expect(screen.getByText('Zona de sobrevenda (abaixo de 30)')).toBeOnTheScreen();
});

describe('SinalCard (RN-03: sinal sempre com histórico)', () => {
  const sinal: Sinal = {
    id: 's-1',
    ativo_id: 'a-1',
    regra_id: 'r-1',
    regra_nome: 'Sobrevenda RSI',
    regra_descricao: 'RSI(14) abaixo de 30 — condição técnica de sobrevenda.',
    data_ativacao: '2026-09-25T15:30:00Z',
    contexto: {},
    data_desativacao: null,
  };
  const backtest: ResultadoBacktest = {
    regra_id: 'r-1',
    ativo_id: 'a-1',
    total_ocorrencias: 3,
    retorno_medio_5_pregoes: '1.5',
    retorno_medio_20_pregoes: null,
    retorno_medio_60_pregoes: '-2',
  };

  it('mostra regra, ativação e estatísticas em pontos percentuais', async () => {
    await render(<SinalCard sinal={sinal} backtest={backtest} carregandoBacktest={false} />);
    expect(screen.getByText('Sobrevenda RSI')).toBeOnTheScreen();
    expect(screen.getByText('Ativo desde 25/09/2026 12:30')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(screen.getByText('+1,50%')).toBeOnTheScreen();
    expect(screen.getByText('—')).toBeOnTheScreen();
    expect(screen.getByText('-2,00%')).toBeOnTheScreen();
  });

  it('zero ocorrências tem mensagem própria', async () => {
    await render(<SinalCard sinal={sinal} backtest={{ ...backtest, total_ocorrencias: 0 }} carregandoBacktest={false} />);
    expect(screen.getByText('Sem ocorrências nos últimos 24 meses')).toBeOnTheScreen();
  });

  it('backtest indisponível não quebra o card', async () => {
    await render(<SinalCard sinal={sinal} carregandoBacktest={false} />);
    expect(screen.getByText('Histórico indisponível no momento')).toBeOnTheScreen();
  });
});
