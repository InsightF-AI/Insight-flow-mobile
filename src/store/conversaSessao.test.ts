import { iaApi } from '@/api/ia';
import type { ChatResponse } from '@/api/tipos';
import { useConversa } from '@/store/conversa';
import { useSessao } from '@/store/sessao';

jest.mock('@/api/ia', () => ({ iaApi: { analisar: jest.fn(), conversar: jest.fn() } }));
jest.mock('@/api/auth', () => ({ authApi: { sair: jest.fn(async () => undefined), renovar: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  useConversa.getState().limpar();
});

it('sair da conta apaga a conversa', async () => {
  jest.mocked(iaApi.conversar).mockResolvedValue({ texto: 'Resposta.', modelo: 'm', aviso_legal: 'a' });
  await useConversa.getState().enviar('Pergunta');
  expect(useConversa.getState().mensagens).toHaveLength(2);

  await useSessao.getState().sair({ revogarNoServidor: false });

  expect(useConversa.getState().mensagens).toEqual([]);
});

it('a resposta que chega depois do logout não entra na conversa da próxima conta', async () => {
  let resolver: (resposta: ChatResponse) => void = () => {};
  jest.mocked(iaApi.conversar).mockReturnValue(
    new Promise<ChatResponse>((ok) => {
      resolver = ok;
    }),
  );
  const envio = useConversa.getState().enviar('Pergunta da conta A');

  await useSessao.getState().sair({ revogarNoServidor: false });
  resolver({ texto: 'Resposta para a conta A', modelo: 'm', aviso_legal: 'a' });
  await envio;

  expect(useConversa.getState().mensagens).toEqual([]);
});
