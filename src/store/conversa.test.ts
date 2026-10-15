import { ApiError } from '@/api/client';
import { iaApi } from '@/api/ia';
import type { ChatResponse } from '@/api/tipos';
import { AVISO_IA } from '@/dominio/regulatorio';
import { useConversa } from '@/store/conversa';

jest.mock('@/api/ia', () => ({ iaApi: { analisar: jest.fn(), conversar: jest.fn() } }));

const resposta = (texto: string, extra: Partial<ChatResponse> = {}): ChatResponse => ({
  texto,
  modelo: 'gemini-3.5-flash',
  aviso_legal: 'Aviso do servidor.',
  ...extra,
});

function pendente<T>() {
  let resolver: (valor: T) => void = () => {};
  let rejeitar: (erro: unknown) => void = () => {};
  const promessa = new Promise<T>((ok, erro) => {
    resolver = ok;
    rejeitar = erro;
  });
  return { promessa, resolver, rejeitar };
}

beforeEach(() => {
  jest.clearAllMocks();
  useConversa.getState().limpar();
});

describe('enviar', () => {
  it('guarda a pergunta e a resposta com modelo e aviso legal', async () => {
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('A carteira rendeu 2%.'));

    const ok = await useConversa.getState().enviar('  Qual o resultado?  ');

    expect(ok).toBe(true);
    expect(iaApi.conversar).toHaveBeenCalledWith([{ papel: 'usuario', texto: 'Qual o resultado?' }]);
    const { mensagens, enviando, erro } = useConversa.getState();
    expect(mensagens.map((m) => [m.papel, m.texto])).toEqual([
      ['usuario', 'Qual o resultado?'],
      ['assistente', 'A carteira rendeu 2%.'],
    ]);
    expect(mensagens[1]).toMatchObject({ modelo: 'gemini-3.5-flash', avisoLegal: 'Aviso do servidor.' });
    expect(enviando).toBe(false);
    expect(erro).toBeNull();
  });

  it('aviso legal vazio na resposta vira o texto fixo (RN-05)', async () => {
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('Resposta.', { aviso_legal: '' }));
    await useConversa.getState().enviar('Oi');
    expect(useConversa.getState().mensagens[1].avisoLegal).toBe(AVISO_IA);
  });

  it('a segunda pergunta leva o histórico inteiro', async () => {
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('Primeira resposta.'));
    await useConversa.getState().enviar('Primeira');
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('Segunda resposta.'));

    await useConversa.getState().enviar('Segunda');

    expect(iaApi.conversar).toHaveBeenLastCalledWith([
      { papel: 'usuario', texto: 'Primeira' },
      { papel: 'assistente', texto: 'Primeira resposta.' },
      { papel: 'usuario', texto: 'Segunda' },
    ]);
  });

  it('pergunta em branco ou acima do limite nem chega ao servidor', async () => {
    expect(await useConversa.getState().enviar('   ')).toBe(false);
    expect(await useConversa.getState().enviar('x'.repeat(2001))).toBe(false);
    expect(iaApi.conversar).not.toHaveBeenCalled();
    expect(useConversa.getState().mensagens).toEqual([]);
  });

  it('ignora um segundo envio enquanto espera a resposta', async () => {
    const espera = pendente<ChatResponse>();
    jest.mocked(iaApi.conversar).mockReturnValue(espera.promessa);
    const primeiro = useConversa.getState().enviar('Primeira');

    expect(useConversa.getState().enviando).toBe(true);
    expect(await useConversa.getState().enviar('Segunda')).toBe(false);
    espera.resolver(resposta('Ok'));
    await primeiro;

    expect(iaApi.conversar).toHaveBeenCalledTimes(1);
    expect(useConversa.getState().mensagens).toHaveLength(2);
  });
});

describe('falha', () => {
  it('a pergunta fica marcada, o erro fica guardado e nada é repetido sozinho', async () => {
    const erro = new ApiError(503, 'Provedor de IA indisponivel');
    jest.mocked(iaApi.conversar).mockRejectedValue(erro);

    const ok = await useConversa.getState().enviar('Qual o resultado?');

    expect(ok).toBe(false);
    const estado = useConversa.getState();
    expect(estado.mensagens).toHaveLength(1);
    expect(estado.mensagens[0]).toMatchObject({ papel: 'usuario', falhou: true });
    expect(estado.erro).toBe(erro);
    expect(estado.enviando).toBe(false);
    expect(iaApi.conversar).toHaveBeenCalledTimes(1);
  });

  it('tentarNovamente reenvia a mesma pergunta sem duplicá-la', async () => {
    jest.mocked(iaApi.conversar).mockRejectedValueOnce(new ApiError(502, 'Resposta da IA bloqueada pelo guardrail'));
    await useConversa.getState().enviar('Qual o resultado?');
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('Rendeu 2%.'));

    const ok = await useConversa.getState().tentarNovamente();

    expect(ok).toBe(true);
    expect(iaApi.conversar).toHaveBeenLastCalledWith([{ papel: 'usuario', texto: 'Qual o resultado?' }]);
    const { mensagens, erro } = useConversa.getState();
    expect(mensagens.map((m) => [m.papel, m.texto, m.falhou ?? false])).toEqual([
      ['usuario', 'Qual o resultado?', false],
      ['assistente', 'Rendeu 2%.', false],
    ]);
    expect(erro).toBeNull();
  });

  it('uma pergunta nova descarta a que falhou: o servidor nunca recebe duas do usuário seguidas', async () => {
    jest.mocked(iaApi.conversar).mockRejectedValueOnce(new ApiError(503, 'Cota do provedor de IA excedida'));
    await useConversa.getState().enviar('Pergunta que falhou');
    jest.mocked(iaApi.conversar).mockResolvedValue(resposta('Resposta.'));

    await useConversa.getState().enviar('Pergunta nova');

    expect(iaApi.conversar).toHaveBeenLastCalledWith([{ papel: 'usuario', texto: 'Pergunta nova' }]);
    expect(useConversa.getState().mensagens.map((m) => m.texto)).toEqual(['Pergunta nova', 'Resposta.']);
  });

  it('tentarNovamente sem pergunta falha pendente não faz nada', async () => {
    expect(await useConversa.getState().tentarNovamente()).toBe(false);
    expect(iaApi.conversar).not.toHaveBeenCalled();
  });
});

describe('limpar e resposta tardia', () => {
  it('limpar durante o envio descarta a resposta que chegar depois', async () => {
    const espera = pendente<ChatResponse>();
    jest.mocked(iaApi.conversar).mockReturnValue(espera.promessa);
    const envio = useConversa.getState().enviar('Pergunta antiga');

    useConversa.getState().limpar();
    espera.resolver(resposta('Resposta antiga'));
    const ok = await envio;

    expect(ok).toBe(false);
    expect(useConversa.getState().mensagens).toEqual([]);
    expect(useConversa.getState().enviando).toBe(false);
  });

  it('o erro tardio de uma conversa apagada também some', async () => {
    const espera = pendente<ChatResponse>();
    jest.mocked(iaApi.conversar).mockReturnValue(espera.promessa);
    const envio = useConversa.getState().enviar('Pergunta antiga');

    useConversa.getState().limpar();
    espera.rejeitar(new ApiError(503, 'Provedor de IA indisponivel'));
    await envio;

    expect(useConversa.getState()).toMatchObject({ mensagens: [], erro: null, enviando: false });
  });

  it('a resposta tardia não se mistura com a pergunta da conversa nova', async () => {
    const antiga = pendente<ChatResponse>();
    jest.mocked(iaApi.conversar).mockReturnValueOnce(antiga.promessa);
    const envioAntigo = useConversa.getState().enviar('Pergunta antiga');
    useConversa.getState().limpar();
    const nova = pendente<ChatResponse>();
    jest.mocked(iaApi.conversar).mockReturnValueOnce(nova.promessa);
    const envioNovo = useConversa.getState().enviar('Pergunta nova');

    antiga.resolver(resposta('Resposta antiga'));
    await envioAntigo;
    expect(useConversa.getState().mensagens.map((m) => m.texto)).toEqual(['Pergunta nova']);
    expect(useConversa.getState().enviando).toBe(true);

    nova.resolver(resposta('Resposta nova'));
    await envioNovo;
    expect(useConversa.getState().mensagens.map((m) => m.texto)).toEqual(['Pergunta nova', 'Resposta nova']);
  });
});
