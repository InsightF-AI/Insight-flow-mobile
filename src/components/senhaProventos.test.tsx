import { render, screen, userEvent } from '@testing-library/react-native';

import { ApiError } from '@/api/client';
import { CardAlterarSenha } from '@/components/CardAlterarSenha';
import { ListaProventosDoAtivo, ListaProventosRecebidos } from '@/components/ListaProventos';

describe('CardAlterarSenha', () => {
  it('fica fechado até o usuário pedir', async () => {
    await render(<CardAlterarSenha aoAlterar={jest.fn()} />);
    expect(screen.queryByLabelText('Senha atual')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Alterar senha' })).toBeOnTheScreen();
  });

  it('não envia com campos inválidos e mostra os erros', async () => {
    const aoAlterar = jest.fn();
    const usuario = userEvent.setup();
    await render(<CardAlterarSenha aoAlterar={aoAlterar} />);

    await usuario.press(screen.getByRole('button', { name: 'Alterar senha' }));
    await usuario.press(screen.getByRole('button', { name: 'Salvar nova senha' }));

    expect(screen.getByText('Informe a senha atual')).toBeOnTheScreen();
    expect(screen.getByText('A senha precisa ter pelo menos 8 caracteres')).toBeOnTheScreen();
    expect(aoAlterar).not.toHaveBeenCalled();
  });

  it('envia as senhas e mostra o erro do servidor traduzido', async () => {
    const aoAlterar = jest.fn().mockRejectedValue(new ApiError(400, 'Senha atual incorreta'));
    const usuario = userEvent.setup();
    await render(<CardAlterarSenha aoAlterar={aoAlterar} />);

    await usuario.press(screen.getByRole('button', { name: 'Alterar senha' }));
    await usuario.type(screen.getByLabelText('Senha atual'), 'antiga123');
    await usuario.type(screen.getByLabelText('Nova senha'), 'nova12345');
    await usuario.type(screen.getByLabelText('Confirmar nova senha'), 'nova12345');
    await usuario.press(screen.getByRole('button', { name: 'Salvar nova senha' }));

    expect(aoAlterar).toHaveBeenCalledWith('antiga123', 'nova12345');
    expect(await screen.findByText('A senha atual está incorreta')).toBeOnTheScreen();
  });
});

describe('ListaProventosDoAtivo', () => {
  it('sem proventos explica o vazio', async () => {
    await render(<ListaProventosDoAtivo proventos={[]} moeda="BRL" />);
    expect(screen.getByText('Sem proventos registrados para este ativo.')).toBeOnTheScreen();
  });

  it('lista data-ex e valor por cota', async () => {
    await render(<ListaProventosDoAtivo proventos={[{ data_ex: '2026-10-01', valor_por_cota: '0.5' }]} moeda="BRL" />);
    expect(screen.getByText('Data-ex 01/10/2026')).toBeOnTheScreen();
    expect(screen.getAllByText(/0,50/).length).toBeGreaterThan(0);
  });

  it('limita a lista e avisa quantos existem', async () => {
    const muitos = Array.from({ length: 10 }, (_, i) => ({ data_ex: `2026-01-${String(i + 10).padStart(2, '0')}`, valor_por_cota: '0.1' }));
    await render(<ListaProventosDoAtivo proventos={muitos} moeda="BRL" />);
    expect(screen.getByText('Mostrando os 8 mais recentes de 10.')).toBeOnTheScreen();
  });
});

describe('ListaProventosRecebidos', () => {
  it('mostra o total e uma linha por provento', async () => {
    await render(
      <ListaProventosRecebidos
        totalBrl="12.5"
        proventos={[
          { ativo_id: 'a-1', ticker: 'HGLG11', data_ex: '2026-10-01', valor_por_cota: '1.25', quantidade: '10', total_brl: '12.5' },
        ]}
      />,
    );
    expect(screen.getByText('Total recebido')).toBeOnTheScreen();
    expect(screen.getByText(/HGLG11 · 01\/10\/2026 · 10 cotas/)).toBeOnTheScreen();
  });

  it('sem proventos explica o vazio', async () => {
    await render(<ListaProventosRecebidos totalBrl="0" proventos={[]} />);
    expect(screen.getByText('Nenhum provento recebido pelas posições da carteira.')).toBeOnTheScreen();
  });
});
