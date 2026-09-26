import { fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';

import { alertasApi } from '@/api/alertas';
import { ApiError } from '@/api/client';
import type { Alerta } from '@/api/tipos';
import { assentarLista, renderizar } from '@/test/renderizar';

import Alertas from '../../app/(tabs)/alertas';

jest.mock('@/api/alertas', () => ({
  alertasApi: { listar: jest.fn(), criar: jest.fn(), atualizar: jest.fn(), remover: jest.fn() },
}));

const alerta: Alerta = {
  id: 'al-1',
  ativo: { id: 'a-1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'ACAO', setor: null, moeda: 'BRL' },
  tipo_condicao: 'PRECO_MAIOR_IGUAL',
  valor_alvo: '40',
  moeda_alvo: 'BRL',
  habilitado: true,
  ultimo_estado: false,
  disparado_em: null,
  criado_em: '2026-09-20T12:00:00Z',
  atualizado_em: '2026-09-20T12:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(alertasApi.listar).mockResolvedValue([]);
});

it('lista vazia mostra estado vazio', async () => {
  await renderizar(<Alertas />);
  expect(await screen.findByText('Nenhum alerta cadastrado.')).toBeOnTheScreen();
  await assentarLista();
});

it('cria alerta com ticker normalizado e limpa o formulário', async () => {
  const user = userEvent.setup();
  jest.mocked(alertasApi.criar).mockResolvedValue(alerta);
  jest.mocked(alertasApi.listar).mockResolvedValueOnce([]).mockResolvedValue([alerta]);
  await renderizar(<Alertas />);
  await user.type(screen.getByLabelText('Ticker'), ' vale3');
  await user.press(screen.getByRole('radio', { name: 'Preço ≤' }));
  await user.type(screen.getByLabelText('Valor alvo'), '61,5');
  await user.press(screen.getByRole('button', { name: 'Criar alerta' }));
  await waitFor(() =>
    expect(alertasApi.criar).toHaveBeenCalledWith({ ticker: 'VALE3', tipo_condicao: 'PRECO_MENOR_IGUAL', valor_alvo: '61.5' }),
  );
  await waitFor(() => expect(screen.getByLabelText('Ticker')).toHaveDisplayValue(''));
  expect(await screen.findByText('PETR4')).toBeOnTheScreen();
  await assentarLista();
});

it('ticker inexistente marca o campo', async () => {
  const user = userEvent.setup();
  jest.mocked(alertasApi.criar).mockRejectedValue(new ApiError(404, 'Ativo nao encontrado'));
  await renderizar(<Alertas />);
  await user.type(screen.getByLabelText('Ticker'), 'XPTO9');
  await user.type(screen.getByLabelText('Valor alvo'), '10');
  await user.press(screen.getByRole('button', { name: 'Criar alerta' }));
  expect(await screen.findByText('Ativo não encontrado')).toBeOnTheScreen();
  await assentarLista();
});

it('alternar o switch desabilita o alerta no backend', async () => {
  jest.mocked(alertasApi.listar).mockResolvedValueOnce([alerta]).mockResolvedValue([{ ...alerta, habilitado: false }]);
  jest.mocked(alertasApi.atualizar).mockResolvedValue({ ...alerta, habilitado: false });
  await renderizar(<Alertas />);
  await fireEvent(await screen.findByRole('switch', { name: 'Alerta de PETR4 habilitado' }), 'valueChange', false);
  expect(alertasApi.atualizar).toHaveBeenCalledWith('al-1', { ativo: false });
  await waitFor(() => expect(screen.getByRole('switch', { name: 'Alerta de PETR4 habilitado' })).not.toBeChecked());
  await assentarLista();
});

it('submit inválido depois de um erro geral da API remove a mensagem geral e mostra só os erros de campo', async () => {
  const user = userEvent.setup();
  jest.mocked(alertasApi.criar).mockRejectedValue(new ApiError(500, 'Falha no servidor'));
  await renderizar(<Alertas />);
  await user.type(screen.getByLabelText('Ticker'), 'PETR4');
  await user.type(screen.getByLabelText('Valor alvo'), '10');
  await user.press(screen.getByRole('button', { name: 'Criar alerta' }));
  expect(await screen.findByText('Falha no servidor')).toBeOnTheScreen();

  await user.clear(screen.getByLabelText('Ticker'));
  await user.press(screen.getByRole('button', { name: 'Criar alerta' }));

  expect(await screen.findByText('Informe o ticker do ativo')).toBeOnTheScreen();
  expect(screen.queryByText('Falha no servidor')).not.toBeOnTheScreen();
  await assentarLista();
});
