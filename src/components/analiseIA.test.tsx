import { render, screen, userEvent } from '@testing-library/react-native';

import { ApiError } from '@/api/client';
import type { AnaliseIA } from '@/api/tipos';
import { CardAnaliseIA } from '@/components/CardAnaliseIA';
import { AVISO_IA } from '@/dominio/regulatorio';
import { formatarDataHora } from '@/utils/formatacao';

const analise: AnaliseIA = {
  ativo_id: 'a-1',
  texto: 'O RSI(14) está em 28,4, na zona de sobrevenda.',
  gerado_em: '2026-10-11T15:30:00Z',
  modelo: 'gemini-3.5-flash',
  em_cache: false,
  desatualizada: false,
  aviso_legal: 'Aviso legal vindo do servidor.',
};

const RECOMENDACAO = /\b(compre|comprar|venda|vender|invista|investir)\b/i;

function textoDaTela(): string {
  return JSON.stringify(screen.toJSON());
}

describe('CardAnaliseIA', () => {
  it('ocioso: explica que é sob demanda, oferece o botão e traz o aviso fixo', async () => {
    const aoGerar = jest.fn();
    const user = userEvent.setup();
    await render(<CardAnaliseIA gerando={false} aoGerar={aoGerar} />);

    expect(screen.getByText(/gerada sob demanda/)).toBeOnTheScreen();
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Gerar análise por IA' }));
    expect(aoGerar).toHaveBeenCalledTimes(1);
    expect(textoDaTela()).not.toMatch(RECOMENDACAO);
  });

  it('gerando: avisa que pode levar até 1 minuto e esconde o botão', async () => {
    await render(<CardAnaliseIA gerando aoGerar={jest.fn()} />);

    expect(screen.getByText('Gerando análise… pode levar até 1 minuto.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Gerar análise por IA' })).not.toBeOnTheScreen();
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
  });

  it('com análise: texto, procedência, modelo, aviso da API e botão de atualizar', async () => {
    await render(<CardAnaliseIA analise={analise} gerando={false} aoGerar={jest.fn()} />);

    expect(screen.getByText(analise.texto)).toBeOnTheScreen();
    expect(screen.getByText(`Gerada em ${formatarDataHora(analise.gerado_em)}.`)).toBeOnTheScreen();
    expect(screen.getByText('Modelo: gemini-3.5-flash')).toBeOnTheScreen();
    expect(screen.getByText('Aviso legal vindo do servidor.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Atualizar análise' })).toBeOnTheScreen();
  });

  it('reaproveitada do cache do servidor', async () => {
    await render(<CardAnaliseIA analise={{ ...analise, em_cache: true }} gerando={false} aoGerar={jest.fn()} />);
    expect(screen.getByText(/Reaproveitada de/)).toBeOnTheScreen();
  });

  it('desatualizada avisa que pode estar velha', async () => {
    await render(
      <CardAnaliseIA analise={{ ...analise, em_cache: true, desatualizada: true }} gerando={false} aoGerar={jest.fn()} />,
    );
    expect(screen.getByText(/Pode estar desatualizada/)).toBeOnTheScreen();
  });

  it('aviso_legal vazio na resposta cai no texto fixo (RN-05)', async () => {
    await render(<CardAnaliseIA analise={{ ...analise, aviso_legal: '' }} gerando={false} aoGerar={jest.fn()} />);
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
  });

  it('atualizando: mantém o texto anterior e mostra o progresso', async () => {
    await render(<CardAnaliseIA analise={analise} gerando aoGerar={jest.fn()} />);

    expect(screen.getByText(analise.texto)).toBeOnTheScreen();
    expect(screen.getByText('Gerando análise… pode levar até 1 minuto.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Atualizar análise' })).not.toBeOnTheScreen();
  });

  it('erro sem análise: mensagem, código do erro, tentar de novo e aviso', async () => {
    const aoGerar = jest.fn();
    const user = userEvent.setup();
    const erro = new ApiError(503, 'Provedor de IA indisponivel', { requestId: 'req-123' });
    await render(<CardAnaliseIA gerando={false} erro={erro} aoGerar={aoGerar} />);

    expect(screen.getByText('A IA está indisponível no momento. Tente novamente em instantes.')).toBeOnTheScreen();
    expect(screen.getByText('Código do erro: req-123')).toBeOnTheScreen();
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(aoGerar).toHaveBeenCalledTimes(1);
  });

  it('cota excedida diz quanto esperar', async () => {
    const erro = new ApiError(503, 'Cota do provedor de IA excedida', { retryAfterSegundos: 120 });
    await render(<CardAnaliseIA gerando={false} erro={erro} aoGerar={jest.fn()} />);
    expect(
      screen.getByText('O limite de uso da IA foi atingido. Tente novamente em cerca de 2 min.'),
    ).toBeOnTheScreen();
  });

  it('tempo esgotado tem texto próprio', async () => {
    const erro = new ApiError(0, 'O servidor demorou demais para responder (http://api)', { causa: 'tempo' });
    await render(<CardAnaliseIA gerando={false} erro={erro} aoGerar={jest.fn()} />);
    expect(screen.getByText(/A análise pode já estar pronta no servidor/)).toBeOnTheScreen();
  });

  it('erro depois de uma análise: a análise anterior continua na tela', async () => {
    const erro = new ApiError(502, 'Resposta da IA bloqueada pelo guardrail');
    await render(<CardAnaliseIA analise={analise} gerando={false} erro={erro} aoGerar={jest.fn()} />);

    expect(screen.getByText(analise.texto)).toBeOnTheScreen();
    expect(
      screen.getByText('A IA não conseguiu gerar um texto dentro das regras de linguagem. Tente novamente.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Aviso legal vindo do servidor.')).toBeOnTheScreen();
  });
});
