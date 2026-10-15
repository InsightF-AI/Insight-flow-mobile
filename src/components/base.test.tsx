import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ApiError } from '@/api/client';
import { Botao } from '@/components/Botao';
import { Campo } from '@/components/Campo';
import { ErroComRetry } from '@/components/ErroComRetry';
import { EstadoConsulta } from '@/components/EstadoConsulta';
import { EstadoVazio } from '@/components/EstadoVazio';
import { SeletorSegmentado } from '@/components/SeletorSegmentado';

describe('Botao', () => {
  it('dispara onPress', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Botao titulo="Entrar" onPress={onPress} />);
    await user.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('carregando fica desabilitado e não dispara', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Botao titulo="Entrar" onPress={onPress} carregando />);
    const botao = screen.getByRole('button', { name: 'Entrar' });
    expect(botao).toBeDisabled();
    await user.press(botao);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Campo', () => {
  it('repassa o texto digitado', async () => {
    const aoMudar = jest.fn();
    await render(<Campo rotulo="Ticker" valor="" aoMudar={aoMudar} />);
    await fireEvent.changeText(screen.getByLabelText('Ticker'), 'VALE3');
    expect(aoMudar).toHaveBeenCalledWith('VALE3');
  });

  it('mostra a mensagem de erro', async () => {
    await render(<Campo rotulo="E-mail" valor="" aoMudar={jest.fn()} erro="Informe um e-mail válido" />);
    expect(screen.getByText('Informe um e-mail válido')).toBeOnTheScreen();
  });
});

describe('ErroComRetry', () => {
  it('mostra a mensagem do ApiError e tenta de novo', async () => {
    const user = userEvent.setup();
    const tentar = jest.fn();
    await render(<ErroComRetry erro={new ApiError(0, 'Sem conexão com o servidor')} aoTentarNovamente={tentar} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Sem conexão com o servidor');
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(tentar).toHaveBeenCalledTimes(1);
  });

  it('mostra o código do erro quando há requestId', async () => {
    await render(<ErroComRetry erro={new ApiError(500, 'x', { requestId: 'srv-42' })} aoTentarNovamente={jest.fn()} />);
    expect(screen.getByText('Código do erro: srv-42')).toBeOnTheScreen();
  });

  it('não mostra código quando não há requestId', async () => {
    await render(<ErroComRetry erro={new ApiError(0, 'Sem conexão com o servidor')} aoTentarNovamente={jest.fn()} />);
    expect(screen.queryByText(/Código do erro/)).not.toBeOnTheScreen();
  });

  it('mensagem explícita tem prioridade', async () => {
    await render(<ErroComRetry erro={new ApiError(404, 'x')} mensagem="Sem cotação" aoTentarNovamente={jest.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Sem cotação');
  });
});

describe('EstadoVazio', () => {
  it('mostra a mensagem e a ação', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<EstadoVazio mensagem="Nada aqui." acao={{ titulo: 'Buscar ativo', onPress }} />);
    expect(screen.getByText('Nada aqui.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Buscar ativo' }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('SeletorSegmentado', () => {
  const opcoes = [
    { valor: '1M', rotulo: '1M' },
    { valor: '3M', rotulo: '3M' },
  ] as const;

  it('marca a opção selecionada e avisa a troca', async () => {
    const user = userEvent.setup();
    const aoSelecionar = jest.fn();
    await render(<SeletorSegmentado rotulo="Período" opcoes={opcoes} selecionado="1M" aoSelecionar={aoSelecionar} />);
    expect(screen.getByRole('radio', { name: '1M' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '3M' })).not.toBeChecked();
    await user.press(screen.getByRole('radio', { name: '3M' }));
    expect(aoSelecionar).toHaveBeenCalledWith('3M');
  });
});

describe('EstadoConsulta', () => {
  const base = { isPending: false, isError: false, error: null, data: undefined, refetch: jest.fn() };

  it('mostra carregando enquanto pendente', async () => {
    await render(<EstadoConsulta consulta={{ ...base, isPending: true }}>{() => <Text>dados</Text>}</EstadoConsulta>);
    expect(screen.getByLabelText('Carregando')).toBeOnTheScreen();
  });

  it('mostra erro com retry', async () => {
    const user = userEvent.setup();
    const refetch = jest.fn();
    await render(
      <EstadoConsulta
        consulta={{ ...base, isError: true, error: new ApiError(404, 'x'), refetch }}
        mensagemErro={() => 'Sem cotação disponível para este ativo.'}
      >
        {() => <Text>dados</Text>}
      </EstadoConsulta>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Sem cotação disponível para este ativo.');
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('entrega os dados ao children', async () => {
    await render(
      <EstadoConsulta consulta={{ ...base, data: 'PETR4' }}>{(dados) => <Text>{`ativo ${dados}`}</Text>}</EstadoConsulta>,
    );
    expect(screen.getByText('ativo PETR4')).toBeOnTheScreen();
  });
});
