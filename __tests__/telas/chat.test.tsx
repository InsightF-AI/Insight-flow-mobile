import * as Clipboard from 'expo-clipboard';
import { act, fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { ApiError } from '@/api/client';
import { iaApi } from '@/api/ia';
import type { ChatResponse } from '@/api/tipos';
import { AVISO_IA } from '@/dominio/regulatorio';
import { SUGESTOES_DO_CHAT } from '@/dominio/ia';
import { renderizar } from '@/test/renderizar';
import { useConversa } from '@/store/conversa';

import Chat from '../../app/(tabs)/chat';

jest.mock('@/api/ia', () => ({ iaApi: { analisar: jest.fn(), conversar: jest.fn() } }));
// A aba fica abaixo do cabeçalho: sem o deslocamento o teclado do iOS cobre o campo. O KeyboardAvoidingView falso
// expõe o deslocamento recebido (o real calcula tudo por layout nativo).
jest.mock('expo-router/react-navigation', () => ({ useHeaderHeight: () => 91 }));
jest.mock('react-native/Libraries/Components/Keyboard/KeyboardAvoidingView', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: ({ children, keyboardVerticalOffset }: { children?: unknown; keyboardVerticalOffset?: number }) => (
      <View testID="teclado" aria-label={`deslocamento ${keyboardVerticalOffset}`}>
        {children as never}
      </View>
    ),
  };
});

const resposta = (texto: string, extra: Partial<ChatResponse> = {}): ChatResponse => ({
  texto,
  modelo: 'gemini-3.5-flash',
  aviso_legal: AVISO_IA,
  ...extra,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  useConversa.getState().limpar();
});

async function digitar(user: ReturnType<typeof userEvent.setup>, texto: string) {
  await user.type(screen.getByLabelText('Mensagem para a IA'), texto);
}

describe('estado inicial', () => {
  it('boas-vindas, as seis sugestões, aviso legal e Enviar desabilitado', async () => {
    await renderizar(<Chat />);

    expect(screen.getByText(/Posso responder sobre a sua carteira simulada/)).toBeOnTheScreen();
    for (const sugestao of SUGESTOES_DO_CHAT) {
      expect(screen.getByRole('button', { name: sugestao })).toBeOnTheScreen();
    }
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Limpar conversa' })).not.toBeOnTheScreen();
    expect(iaApi.conversar).not.toHaveBeenCalled();
  });

  it('os textos estáticos não recomendam compra nem venda (RN-01)', async () => {
    await renderizar(<Chat />);
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/\b(compre|comprar|venda|vender|invista|investir)\b/i);
  });
});

describe('teclado', () => {
  it('desloca o rodapé pela altura do cabeçalho para o teclado do iOS não cobrir o campo', async () => {
    await renderizar(<Chat />);
    expect(screen.getByTestId('teclado')).toHaveProp('aria-label', 'deslocamento 91');
  });
});

describe('conversa', () => {
  it('envia a pergunta, mostra a resposta e limpa o campo', async () => {
    const user = userEvent.setup();
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('A carteira rendeu 2% no mês.'));
    await renderizar(<Chat />);

    await digitar(user, 'Qual o resultado da carteira?');
    await user.press(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByText('A carteira rendeu 2% no mês.')).toBeOnTheScreen();
    expect(screen.getByText('Qual o resultado da carteira?')).toBeOnTheScreen();
    expect(iaApi.conversar).toHaveBeenCalledWith([{ papel: 'usuario', texto: 'Qual o resultado da carteira?' }]);
    expect(screen.getByLabelText('Mensagem para a IA')).toHaveDisplayValue('');
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
  });

  it('toque numa sugestão envia direto e as sugestões saem da tela', async () => {
    const user = userEvent.setup();
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('Está acima do CDI.'));
    await renderizar(<Chat />);

    await user.press(screen.getByRole('button', { name: 'A carteira está acima do CDI?' }));

    expect(await screen.findByText('Está acima do CDI.')).toBeOnTheScreen();
    expect(iaApi.conversar).toHaveBeenCalledWith([{ papel: 'usuario', texto: 'A carteira está acima do CDI?' }]);
    expect(screen.queryByRole('button', { name: 'Quais sinais estão ativos agora?' })).not.toBeOnTheScreen();
  });

  it('enquanto espera, mostra o progresso e trava o envio', async () => {
    const user = userEvent.setup();
    let concluir: (r: ChatResponse) => void = () => {};
    jest.mocked(iaApi.conversar).mockReturnValue(
      new Promise<ChatResponse>((ok) => {
        concluir = ok;
      }),
    );
    await renderizar(<Chat />);

    await digitar(user, 'Qual o resultado?');
    await user.press(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByText('Consultando os dados da carteira… pode levar até 1 minuto.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
    concluir(resposta('Pronto.'));
    expect(await screen.findByText('Pronto.')).toBeOnTheScreen();
  });

  it('pergunta acima de 2000 caracteres mostra o limite e não envia', async () => {
    await renderizar(<Chat />);

    // Digitar 2001 caracteres um a um estoura o tempo do teste: o evento de texto entra de uma vez.
    await fireEvent.changeText(screen.getByLabelText('Mensagem para a IA'), 'x'.repeat(2001));

    expect(screen.getByText('A pergunta tem 2001 caracteres; o limite é 2000.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });
});

describe('falhas da IA', () => {
  it.each([
    [new ApiError(503, 'Provedor de IA indisponivel'), 'A IA está indisponível no momento. Tente novamente em instantes.'],
    [
      new ApiError(503, 'Cota do provedor de IA excedida', { retryAfterSegundos: 90 }),
      'O limite de uso da IA foi atingido. Tente novamente em cerca de 2 min.',
    ],
    [
      new ApiError(502, 'Resposta da IA bloqueada pelo guardrail'),
      'A IA não conseguiu gerar um texto dentro das regras de linguagem. Tente novamente.',
    ],
    [
      new ApiError(0, 'O servidor demorou demais para responder (http://api)', { causa: 'tempo' }),
      'A IA demorou mais que o esperado para responder. Tente enviar a pergunta de novo.',
    ],
  ])('mostra a mensagem legível e deixa tentar de novo (%#)', async (erro, mensagem) => {
    const user = userEvent.setup();
    jest.mocked(iaApi.conversar).mockRejectedValueOnce(erro);
    await renderizar(<Chat />);

    await digitar(user, 'Qual o resultado?');
    await user.press(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByText(mensagem)).toBeOnTheScreen();
    expect(screen.getByText('Não enviada')).toBeOnTheScreen();
    expect(screen.getByText(AVISO_IA)).toBeOnTheScreen();
    expect(iaApi.conversar).toHaveBeenCalledTimes(1);

    jest.mocked(iaApi.conversar).mockResolvedValueOnce(resposta('Rendeu 2%.'));
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Rendeu 2%.')).toBeOnTheScreen();
    expect(screen.queryByText('Não enviada')).not.toBeOnTheScreen();
    expect(screen.getAllByText('Qual o resultado?')).toHaveLength(1);
  });
});

describe('copiar e limpar', () => {
  it('copiar leva o texto da resposta com o aviso legal e confirma', async () => {
    const user = userEvent.setup();
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('A carteira rendeu 2%.', { aviso_legal: 'Aviso do servidor.' }));
    await renderizar(<Chat />);
    await digitar(user, 'Qual o resultado?');
    await user.press(screen.getByRole('button', { name: 'Enviar' }));
    await screen.findByText('A carteira rendeu 2%.');

    await user.press(screen.getByRole('button', { name: 'Copiar resposta' }));

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('A carteira rendeu 2%.\n\nAviso do servidor.');
    expect(await screen.findByText('Copiado')).toBeOnTheScreen();
  });

  it('falha ao copiar avisa em vez de fingir que copiou', async () => {
    const user = userEvent.setup();
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(Clipboard.setStringAsync).mockRejectedValueOnce(new Error('sem acesso'));
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('Resposta.'));
    await renderizar(<Chat />);
    await digitar(user, 'Oi');
    await user.press(screen.getByRole('button', { name: 'Enviar' }));
    await screen.findByText('Resposta.');

    await user.press(screen.getByRole('button', { name: 'Copiar resposta' }));

    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Não foi possível copiar', expect.any(String)));
    expect(screen.queryByText('Copiado')).not.toBeOnTheScreen();
  });

  it('limpar pede confirmação e volta ao estado inicial', async () => {
    const user = userEvent.setup();
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('Resposta.'));
    await renderizar(<Chat />);
    await digitar(user, 'Oi');
    await user.press(screen.getByRole('button', { name: 'Enviar' }));
    await screen.findByText('Resposta.');

    await user.press(screen.getByRole('button', { name: 'Limpar conversa' }));

    expect(alerta).toHaveBeenCalledWith('Limpar conversa', expect.any(String), expect.any(Array));
    // Cancelar não apaga.
    expect(screen.getByText('Resposta.')).toBeOnTheScreen();

    const botoes = alerta.mock.calls[0][2] ?? [];
    await act(async () => {
      botoes.find((b) => b.text === 'Limpar')?.onPress?.();
    });

    await waitFor(() => expect(screen.queryByText('Resposta.')).not.toBeOnTheScreen());
    expect(screen.getByRole('button', { name: SUGESTOES_DO_CHAT[0] })).toBeOnTheScreen();
  });
});
