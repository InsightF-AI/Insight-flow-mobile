import { render, screen, userEvent } from '@testing-library/react-native';

import type { Ativo, CotacaoAtual } from '@/api/tipos';
import { LinhaAtivo } from '@/components/LinhaAtivo';
import { LinhaResultadoBusca } from '@/components/LinhaResultadoBusca';

const NBSP = ' ';
const ativo: Ativo = { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: 'Petróleo', moeda: 'BRL' };
const cotacao: CotacaoAtual = {
  ticker: 'PETR4',
  preco: '38.5',
  variacao: '0.4',
  variacao_percentual: '1.05',
  maxima_dia: '39',
  minima_dia: '38',
  volume: '1000',
};

describe('LinhaAtivo', () => {
  it('mostra ticker, tipo, preço na moeda do ativo e variação em pontos', async () => {
    await render(<LinhaAtivo ativo={ativo} cotacao={cotacao} estadoCotacao="ok" aoPressionar={jest.fn()} />);
    expect(screen.getByText('PETR4')).toBeOnTheScreen();
    expect(screen.getByText('Ação · Petrobras PN')).toBeOnTheScreen();
    expect(screen.getByText(`R$${NBSP}38,50`)).toBeOnTheScreen();
    expect(screen.getByText('▲ +1,05%')).toBeOnTheScreen();
  });

  it('sem cotação mostra traço e legenda', async () => {
    await render(<LinhaAtivo ativo={ativo} estadoCotacao="indisponivel" aoPressionar={jest.fn()} />);
    expect(screen.getByText('—')).toBeOnTheScreen();
    expect(screen.getByText('sem cotação')).toBeOnTheScreen();
  });

  it('é pressionável pelo nome acessível', async () => {
    const user = userEvent.setup();
    const aoPressionar = jest.fn();
    await render(<LinhaAtivo ativo={ativo} estadoCotacao="carregando" aoPressionar={aoPressionar} />);
    await user.press(screen.getByRole('button', { name: 'PETR4, Petrobras PN' }));
    expect(aoPressionar).toHaveBeenCalled();
  });

  it('mostra o selo de sinais só quando há sinais, com singular e plural', async () => {
    const { rerender } = await render(
      <LinhaAtivo ativo={ativo} cotacao={cotacao} estadoCotacao="ok" sinais={1} aoPressionar={jest.fn()} />,
    );
    expect(screen.getByText('1 sinal')).toBeOnTheScreen();
    await rerender(<LinhaAtivo ativo={ativo} cotacao={cotacao} estadoCotacao="ok" sinais={2} aoPressionar={jest.fn()} />);
    expect(screen.getByText('2 sinais')).toBeOnTheScreen();
    await rerender(<LinhaAtivo ativo={ativo} cotacao={cotacao} estadoCotacao="ok" sinais={0} aoPressionar={jest.fn()} />);
    expect(screen.queryByText(/sinal/)).not.toBeOnTheScreen();
  });

  it('sem aoAlternarNotificacao não mostra o sino', async () => {
    await render(<LinhaAtivo ativo={ativo} estadoCotacao="carregando" notificar aoPressionar={jest.fn()} />);
    expect(screen.queryByRole('switch')).not.toBeOnTheScreen();
  });

  it('o sino reflete o estado e alterna sem abrir o ativo', async () => {
    const user = userEvent.setup();
    const aoPressionar = jest.fn();
    const aoAlternar = jest.fn();
    await render(
      <LinhaAtivo
        ativo={ativo}
        estadoCotacao="carregando"
        notificar
        aoAlternarNotificacao={aoAlternar}
        aoPressionar={aoPressionar}
      />,
    );
    const sino = screen.getByRole('switch', { name: 'Notificações de PETR4' });
    expect(sino).toBeChecked();
    await user.press(sino);
    expect(aoAlternar).toHaveBeenCalledTimes(1);
    expect(aoPressionar).not.toHaveBeenCalled();
  });
});

it('LinhaResultadoBusca mostra o ativo encontrado', async () => {
  await render(
    <LinhaResultadoBusca
      ativo={{ ticker: 'VALE3', nome: 'Vale ON', tipo: 'ACAO', moeda: 'BRL', setor: null }}
      aoPressionar={jest.fn()}
    />,
  );
  expect(screen.getByRole('button', { name: 'VALE3, Vale ON' })).toBeOnTheScreen();
  expect(screen.getByText('Ação · BRL')).toBeOnTheScreen();
});
