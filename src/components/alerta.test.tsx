import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import type { Alerta } from '@/api/tipos';
import { ItemAlerta } from '@/components/ItemAlerta';

const NBSP = ' ';

const alerta: Alerta = {
  id: 'al-1',
  ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: null, moeda: 'BRL' },
  tipo_condicao: 'PRECO_MAIOR_IGUAL',
  valor_alvo: '40',
  moeda_alvo: 'BRL',
  habilitado: true,
  ultimo_estado: true,
  disparado_em: '2026-09-25T15:30:00Z',
  criado_em: '2026-09-20T12:00:00Z',
  atualizado_em: '2026-09-25T15:30:00Z',
};

it('mostra ticker, condição e quando disparou', async () => {
  await render(<ItemAlerta alerta={alerta} aoAlternar={jest.fn()} aoRemover={jest.fn()} ocupado={false} />);
  expect(screen.getByText('PETR4')).toBeOnTheScreen();
  expect(screen.getByText(`Preço ≥ R$${NBSP}40,00`)).toBeOnTheScreen();
  expect(screen.getByText('Disparado em 25/09/2026 12:30')).toBeOnTheScreen();
});

it('o switch reflete e alterna o estado', async () => {
  const aoAlternar = jest.fn();
  await render(<ItemAlerta alerta={alerta} aoAlternar={aoAlternar} aoRemover={jest.fn()} ocupado={false} />);
  const chave = screen.getByRole('switch', { name: 'Alerta de PETR4 habilitado' });
  expect(chave).toBeChecked();
  await fireEvent(chave, 'valueChange', false);
  expect(aoAlternar).toHaveBeenCalledWith(false);
});

it('botão de remover chama aoRemover', async () => {
  const user = userEvent.setup();
  const aoRemover = jest.fn();
  await render(<ItemAlerta alerta={alerta} aoAlternar={jest.fn()} aoRemover={aoRemover} ocupado={false} />);
  await user.press(screen.getByRole('button', { name: 'Remover alerta de PETR4' }));
  expect(aoRemover).toHaveBeenCalled();
});

describe('ItemAlerta: preço atual e distância ao alvo', () => {
  it('mostra o preço atual e quanto falta para o alvo', async () => {
    await render(
      <ItemAlerta alerta={alerta} cotacao={{ preco: '38' }} ocupado={false} aoAlternar={jest.fn()} aoRemover={jest.fn()} />,
    );
    expect(screen.getByText(/Preço atual/)).toBeOnTheScreen();
    expect(screen.getByText('Faltam 5,26% para o alvo')).toBeOnTheScreen();
  });

  it('alvo alcançado diz "Alvo atingido"', async () => {
    await render(
      <ItemAlerta alerta={alerta} cotacao={{ preco: '41' }} ocupado={false} aoAlternar={jest.fn()} aoRemover={jest.fn()} />,
    );
    expect(screen.getByText('Alvo atingido')).toBeOnTheScreen();
  });

  it('sem cotação não inventa distância', async () => {
    await render(
      <ItemAlerta alerta={alerta} cotacaoIndisponivel ocupado={false} aoAlternar={jest.fn()} aoRemover={jest.fn()} />,
    );
    expect(screen.getByText('Preço atual indisponível')).toBeOnTheScreen();
    expect(screen.queryByText(/Faltam/)).not.toBeOnTheScreen();
  });
});
