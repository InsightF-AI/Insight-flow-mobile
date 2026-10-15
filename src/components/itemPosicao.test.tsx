import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { Operacao, Posicao } from '@/api/tipos';
import { ItemOperacao } from '@/components/ItemOperacao';
import { ItemPosicao } from '@/components/ItemPosicao';
import { coresEscuro } from '@/theme/cores';

const posicao: Posicao = {
  ativo_id: 'a-1',
  ticker: 'PETR4',
  quantidade: '10',
  preco_medio: '30',
  cotacao_atual: '33',
  valor_mercado: '330',
  valor_mercado_brl: '330',
  lucro_nao_realizado: '30',
  lucro_realizado: '0',
};

describe('ItemPosicao: variação do dia', () => {
  it('mostra a variação do dia em pontos percentuais', async () => {
    await render(<ItemPosicao posicao={posicao} moeda="BRL" variacaoDoDia="1.05" />);
    expect(screen.getByText('▲ +1,05%')).toBeOnTheScreen();
  });

  it('variação indisponível aparece como traço, nunca como 0,00%', async () => {
    await render(<ItemPosicao posicao={posicao} moeda="BRL" variacaoDoDia={null} />);
    expect(screen.getByText('Hoje —')).toBeOnTheScreen();
    expect(screen.queryByText(/0,00%/)).not.toBeOnTheScreen();
  });

  it('enquanto carrega não mostra nada no lugar da variação', async () => {
    await render(<ItemPosicao posicao={posicao} moeda="BRL" />);
    expect(screen.queryByText(/Hoje/)).not.toBeOnTheScreen();
    expect(screen.queryByText(/%/)).not.toBeOnTheScreen();
  });

  it('com aoPressionar vira botão', async () => {
    const user = userEvent.setup();
    const aoPressionar = jest.fn();
    await render(<ItemPosicao posicao={posicao} moeda="BRL" aoPressionar={aoPressionar} />);
    await user.press(screen.getByRole('button'));
    expect(aoPressionar).toHaveBeenCalledTimes(1);
  });

  it('sem aoPressionar não é botão', async () => {
    await render(<ItemPosicao posicao={posicao} moeda="BRL" />);
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });
});

describe('ItemOperacao: COMPRA e VENDA sem verde nem vermelho', () => {
  const base: Operacao = {
    id: 'o-1',
    ativo_id: 'a-1',
    tipo: 'COMPRA',
    quantidade: '10',
    preco_unitario: '30',
    data: '2026-09-01',
    criado_em: '2026-09-01T12:00:00Z',
  };

  it.each([
    ['COMPRA', 'Compra · PETR4'],
    ['VENDA', 'Venda · PETR4'],
  ] as const)('%s usa a cor padrão de texto', async (tipo, titulo) => {
    await render(
      <ItemOperacao operacao={{ ...base, tipo }} ticker="PETR4" moeda="BRL" aoRemover={jest.fn()} removendo={false} />,
    );
    const estilo = StyleSheet.flatten(screen.getByText(titulo).props.style) as { color?: string };
    expect([coresEscuro.positivo, coresEscuro.negativo]).not.toContain(estilo.color);
  });
});
