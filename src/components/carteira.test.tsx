import { render, screen, userEvent } from '@testing-library/react-native';

import type { Operacao, Posicao } from '@/api/tipos';
import { ItemOperacao } from '@/components/ItemOperacao';
import { ItemPosicao } from '@/components/ItemPosicao';

const NBSP = ' ';

it('ItemPosicao mostra quantidade, preço médio, valor em BRL e lucro com sinal', async () => {
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
  await render(<ItemPosicao posicao={posicao} moeda="BRL" />);
  expect(screen.getByText('PETR4')).toBeOnTheScreen();
  expect(screen.getByText(`10 × PM R$${NBSP}30,00`)).toBeOnTheScreen();
  expect(screen.getByText(`R$${NBSP}330,00`)).toBeOnTheScreen();
  expect(screen.getByText(`+R$${NBSP}30,00`)).toBeOnTheScreen();
});

it('ItemOperacao descreve a operação simulada e permite remover', async () => {
  const user = userEvent.setup();
  const aoRemover = jest.fn();
  const operacao: Operacao = {
    id: 'o-1',
    ativo_id: 'a-1',
    tipo: 'VENDA',
    quantidade: '5',
    preco_unitario: '40',
    data: '2026-09-10',
    criado_em: '2026-09-10T12:00:00Z',
  };
  await render(<ItemOperacao operacao={operacao} ticker="PETR4" moeda="BRL" aoRemover={aoRemover} removendo={false} />);
  expect(screen.getByText('Venda · PETR4')).toBeOnTheScreen();
  expect(screen.getByText(`10/09/2026 · 5 × R$${NBSP}40,00`)).toBeOnTheScreen();
  expect(screen.getByText(`R$${NBSP}200,00`)).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Remover operação de venda de PETR4 em 10/09/2026' }));
  expect(aoRemover).toHaveBeenCalled();
});
