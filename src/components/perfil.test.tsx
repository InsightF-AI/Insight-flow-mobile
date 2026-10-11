import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { ApiError } from '@/api/client';
import type { ItemWatchlist } from '@/api/tipos';
import { CardNotificarPorAtivo } from '@/components/CardNotificarPorAtivo';
import { CardPush } from '@/components/CardPush';
import { CardServidor } from '@/components/CardServidor';

const propsPush = {
  situacao: 'ligado' as const,
  ligado: true,
  ocupado: false,
  aoAlternar: jest.fn(),
  aoTentarNovamente: jest.fn(),
  aoAbrirConfiguracoes: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe('CardPush', () => {
  it('ligado: título, detalhe e interruptor ligado', async () => {
    await render(<CardPush {...propsPush} />);
    expect(screen.getByText('Ligadas neste aparelho')).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Notificações push' })).toBeChecked();
  });

  it('alternar chama aoAlternar com o novo valor', async () => {
    await render(<CardPush {...propsPush} situacao="desligado" ligado={false} />);

    await fireEvent(screen.getByRole('switch', { name: 'Notificações push' }), 'valueChange', true);

    expect(propsPush.aoAlternar).toHaveBeenCalledWith(true);
  });

  it('indisponível: explica o motivo e o interruptor fica desabilitado', async () => {
    await render(<CardPush {...propsPush} situacao="indisponivel" motivo="expo-go" ligado={false} />);
    expect(screen.getByText('Indisponíveis neste aparelho')).toBeOnTheScreen();
    expect(screen.getByText(/development build/)).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Notificações push' })).toBeDisabled();
  });

  it('negado: oferece abrir as configurações do sistema', async () => {
    const user = userEvent.setup();
    await render(<CardPush {...propsPush} situacao="negado" ligado={false} />);

    await user.press(screen.getByRole('button', { name: 'Abrir configurações do sistema' }));

    expect(propsPush.aoAbrirConfiguracoes).toHaveBeenCalledTimes(1);
  });

  it('erro: mostra a mensagem legível, o código e tenta de novo', async () => {
    const user = userEvent.setup();
    const erro = new ApiError(422, 'Token de push invalido', { requestId: 'req-9' });
    await render(<CardPush {...propsPush} situacao="erro" erro={erro} />);

    expect(screen.getByText('Não foi possível registrar este aparelho para notificações')).toBeOnTheScreen();
    expect(screen.getByText('Código do erro: req-9')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(propsPush.aoTentarNovamente).toHaveBeenCalledTimes(1);
  });
});

const itens: ItemWatchlist[] = [
  {
    ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar: true,
    adicionado_em: '2026-09-20T12:00:00Z',
  },
  {
    ativo: { id: 'a-2', ticker: 'VALE3', nome: 'Vale ON', tipo: 'ACAO', setor: null, moeda: 'BRL' },
    notificar: false,
    adicionado_em: '2026-09-21T12:00:00Z',
  },
];

describe('CardNotificarPorAtivo', () => {
  it('lista cada ativo com o interruptor no estado do servidor', async () => {
    await render(<CardNotificarPorAtivo itens={itens} aoAlternar={jest.fn()} aoTentarNovamente={jest.fn()} />);

    expect(screen.getByRole('switch', { name: 'Notificar PETR4' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Notificar VALE3' })).not.toBeChecked();
    expect(screen.getByText('Petrobras PN')).toBeOnTheScreen();
  });

  it('alternar devolve o ativo e o novo valor', async () => {
    const aoAlternar = jest.fn();
    await render(<CardNotificarPorAtivo itens={itens} aoAlternar={aoAlternar} aoTentarNovamente={jest.fn()} />);

    await fireEvent(screen.getByRole('switch', { name: 'Notificar VALE3' }), 'valueChange', true);

    expect(aoAlternar).toHaveBeenCalledWith('a-2', true);
  });

  it('watchlist vazia', async () => {
    await render(<CardNotificarPorAtivo itens={[]} aoAlternar={jest.fn()} aoTentarNovamente={jest.fn()} />);
    expect(screen.getByText(/watchlist está vazia/)).toBeOnTheScreen();
  });

  it('falha ao carregar: mensagem e tentar de novo', async () => {
    const aoTentarNovamente = jest.fn();
    const user = userEvent.setup();
    await render(
      <CardNotificarPorAtivo
        erro={new ApiError(500, 'Erro 500')}
        aoAlternar={jest.fn()}
        aoTentarNovamente={aoTentarNovamente}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(aoTentarNovamente).toHaveBeenCalledTimes(1);
  });

  it('carregando mostra o estado de espera', async () => {
    await render(<CardNotificarPorAtivo carregando aoAlternar={jest.fn()} aoTentarNovamente={jest.fn()} />);
    expect(screen.getAllByLabelText('Carregando').length).toBeGreaterThan(0);
  });
});

describe('CardServidor', () => {
  it('mostra o endereço e testa a conexão', async () => {
    const aoTestar = jest.fn();
    const user = userEvent.setup();
    await render(<CardServidor url="http://192.168.0.247:8000" testando={false} aoTestar={aoTestar} />);

    expect(screen.getByText('http://192.168.0.247:8000')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Testar conexão' }));
    expect(aoTestar).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ ok: true as const, ms: 42 }, 'Conectado (42 ms)'],
    [{ ok: false as const, motivo: 'rede' as const }, 'Sem conexão com o servidor. Confira o Wi-Fi e o endereço.'],
    [{ ok: false as const, motivo: 'tempo' as const }, 'O servidor demorou demais para responder.'],
    [{ ok: false as const, motivo: 'servidor' as const, status: 502 }, 'O servidor respondeu com erro 502.'],
  ])('resultado %p', async (resultado, texto) => {
    await render(<CardServidor url="http://api" resultado={resultado} testando={false} aoTestar={jest.fn()} />);
    expect(screen.getByText(texto)).toBeOnTheScreen();
  });

  it('testando: o botão fica ocupado', async () => {
    await render(<CardServidor url="http://api" testando aoTestar={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Testar conexão' })).toBeDisabled();
  });
});
