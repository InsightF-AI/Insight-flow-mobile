import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { AlternadorFiltro } from '@/components/AlternadorFiltro';
import { GraficoCandles } from '@/components/GraficoCandles';
import { PainelTecnico } from '@/components/PainelTecnico';
import type { AnaliseTecnica, Candle } from '@/dominio/candles';

// O Skia não é transformável pelo Jest do projeto: a geometria é testada à parte e aqui o desenho é um stub.
jest.mock('@shopify/react-native-skia', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const caminho = () => ({ moveTo: jest.fn(), lineTo: jest.fn(), addRect: jest.fn(), close: jest.fn() });
  return {
    Canvas: View,
    Path: () => null,
    Skia: {
      Path: { Make: caminho },
      XYWHRect: (x: number, y: number, largura: number, altura: number) => ({ x, y, width: largura, height: altura }),
    },
  };
});

const NBSP = ' ';

function candle(indice: number): Candle {
  const fechamento = 100 + indice;
  return {
    data: `2026-09-${String(10 + indice).padStart(2, '0')}`,
    abertura: fechamento - 1,
    maxima: fechamento + 2,
    minima: fechamento - 2,
    fechamento,
    volume: 1000 * (indice + 1),
  };
}

function analise(): AnaliseTecnica {
  const candles = Array.from({ length: 10 }, (_, i) => candle(i));
  const nula = candles.map(() => null);
  return {
    candles,
    sma20: candles.map((c) => c.fechamento - 1),
    sma50: nula,
    sma200: nula,
    bollinger: {
      superior: candles.map((c) => c.fechamento + 5),
      media: candles.map((c) => c.fechamento),
      inferior: candles.map((c) => c.fechamento - 5),
    },
    rsi: candles.map((_, i) => 40 + i),
    macd: {
      linha: candles.map((_, i) => 0.5 + i / 10),
      sinal: candles.map((_, i) => 0.4 + i / 10),
      histograma: candles.map(() => 0.1),
    },
  };
}

const TODAS_DESLIGADAS = { sma20: false, sma50: false, sma200: false, bollinger: false };

async function medirCandles(largura = 108) {
  await fireEvent(screen.getByTestId('area-candles'), 'layout', {
    nativeEvent: { layout: { width: largura, height: 260 } },
  });
}

async function tocarEm(x: number) {
  await act(async () => {
    fireGestureHandler(getByGestureTestId('candles-arrasto'), [{ x }, { x }]);
  });
}

describe('AlternadorFiltro', () => {
  it('é um interruptor acessível', async () => {
    const user = userEvent.setup();
    const alternar = jest.fn();
    await render(<AlternadorFiltro rotulo="SMA 20" ativo cor="#3aa0ff" aoAlternar={alternar} />);
    const botao = screen.getByRole('switch', { name: 'SMA 20' });
    expect(botao).toBeChecked();
    await user.press(botao);
    expect(alternar).toHaveBeenCalledTimes(1);
  });
});

describe('GraficoCandles', () => {
  it('toque e arrasto escolhem o candle sob o dedo', async () => {
    const selecionar = jest.fn();
    await render(
      <GraficoCandles
        analise={analise()}
        sobreposicoes={TODAS_DESLIGADAS}
        indiceSelecionado={null}
        aoSelecionar={selecionar}
      />,
    );
    await medirCandles();
    await tocarEm(39);
    expect(selecionar).toHaveBeenLastCalledWith(3);
    await tocarEm(500);
    expect(selecionar).toHaveBeenLastCalledWith(9);
  });

  it('antes de medir a largura o toque não escolhe candle', async () => {
    const selecionar = jest.fn();
    await render(
      <GraficoCandles
        analise={analise()}
        sobreposicoes={TODAS_DESLIGADAS}
        indiceSelecionado={null}
        aoSelecionar={selecionar}
      />,
    );
    await tocarEm(39);
    expect(selecionar).not.toHaveBeenCalled();
  });

  it('descreve o gráfico para leitores de tela', async () => {
    await render(
      <GraficoCandles
        analise={analise()}
        sobreposicoes={TODAS_DESLIGADAS}
        indiceSelecionado={null}
        aoSelecionar={jest.fn()}
      />,
    );
    expect(screen.getByLabelText(/Gráfico de candles de 10\/09\/2026 a 19\/09\/2026/)).toBeOnTheScreen();
  });
});

describe('PainelTecnico', () => {
  it('mostra o último candle por padrão, com data, preços e indicadores', async () => {
    await render(<PainelTecnico analise={analise()} moeda="BRL" />);
    expect(screen.getByText('19/09/2026')).toBeOnTheScreen();
    expect(screen.getByText(`Fechamento R$${NBSP}109,00`)).toBeOnTheScreen();
    expect(screen.getByText('RSI (14): 49,0')).toBeOnTheScreen();
  });

  it('tocar num candle troca os valores mostrados', async () => {
    await render(<PainelTecnico analise={analise()} moeda="BRL" />);
    await medirCandles();
    await tocarEm(9);
    expect(await screen.findByText('10/09/2026')).toBeOnTheScreen();
    expect(screen.getByText(`Fechamento R$${NBSP}100,00`)).toBeOnTheScreen();
    expect(screen.getByText('RSI (14): 40,0')).toBeOnTheScreen();
  });

  it('médias e Bollinger são alternáveis; SMA 20 e SMA 50 começam ligadas', async () => {
    const user = userEvent.setup();
    await render(<PainelTecnico analise={analise()} moeda="BRL" />);
    expect(screen.getByRole('switch', { name: 'SMA 20' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'SMA 50' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'SMA 200' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Bollinger' })).not.toBeChecked();
    await user.press(screen.getByRole('switch', { name: 'Bollinger' }));
    expect(screen.getByRole('switch', { name: 'Bollinger' })).toBeChecked();
  });

  it('valor ausente do indicador aparece como traço, nunca zero', async () => {
    const base = analise();
    const semRsi = { ...base, rsi: base.rsi.map(() => null) };
    await render(<PainelTecnico analise={semRsi} moeda="BRL" />);
    expect(screen.getByText('RSI (14): —')).toBeOnTheScreen();
  });
});
