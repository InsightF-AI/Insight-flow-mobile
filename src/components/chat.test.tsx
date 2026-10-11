import { render, screen, userEvent } from '@testing-library/react-native';

import { BalaoMensagem } from '@/components/BalaoMensagem';
import { SugestoesChat } from '@/components/SugestoesChat';

describe('BalaoMensagem', () => {
  it('pergunta do usuário não tem botão de copiar', async () => {
    await render(<BalaoMensagem papel="usuario" texto="Qual o resultado?" />);
    expect(screen.getByText('Qual o resultado?')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Copiar resposta' })).not.toBeOnTheScreen();
  });

  it('resposta da IA copia pelo botão', async () => {
    const aoCopiar = jest.fn();
    const user = userEvent.setup();
    await render(<BalaoMensagem papel="assistente" texto="Rendeu 2%." aoCopiar={aoCopiar} />);

    await user.press(screen.getByRole('button', { name: 'Copiar resposta' }));

    expect(aoCopiar).toHaveBeenCalledTimes(1);
  });

  it('depois de copiar mostra a confirmação', async () => {
    await render(<BalaoMensagem papel="assistente" texto="Rendeu 2%." aoCopiar={jest.fn()} copiado />);
    expect(screen.getByRole('button', { name: 'Resposta copiada' })).toBeOnTheScreen();
    expect(screen.getByText('Copiado')).toBeOnTheScreen();
  });

  it('pergunta que falhou diz que não foi enviada', async () => {
    await render(<BalaoMensagem papel="usuario" texto="Qual o resultado?" falhou />);
    expect(screen.getByText('Não enviada')).toBeOnTheScreen();
  });
});

describe('SugestoesChat', () => {
  it('toque numa sugestão devolve o texto dela', async () => {
    const aoEscolher = jest.fn();
    const user = userEvent.setup();
    await render(<SugestoesChat sugestoes={['A carteira está acima do CDI?', 'Qual foi meu ativo mais rentável?']} aoEscolher={aoEscolher} />);

    await user.press(screen.getByRole('button', { name: 'A carteira está acima do CDI?' }));

    expect(aoEscolher).toHaveBeenCalledWith('A carteira está acima do CDI?');
  });

  it('desabilitadas não respondem ao toque', async () => {
    const aoEscolher = jest.fn();
    const user = userEvent.setup();
    await render(<SugestoesChat sugestoes={['A carteira está acima do CDI?']} aoEscolher={aoEscolher} desabilitado />);

    await user.press(screen.getByRole('button', { name: 'A carteira está acima do CDI?' }));

    expect(aoEscolher).not.toHaveBeenCalled();
  });
});
