import { create } from 'zustand';

import { iaApi } from '@/api/ia';
import { avisoLegalDe, type MensagemLocal, montarMensagensDaApi, validarPergunta } from '@/dominio/ia';

interface EstadoConversa {
  mensagens: MensagemLocal[];
  enviando: boolean;
  /** Erro do último envio; a pergunta que falhou continua na lista, marcada. `null` quando não há. */
  erro: unknown;
  /** `true` quando a resposta da IA chegou. */
  enviar: (texto: string) => Promise<boolean>;
  /** Reenvia a pergunta que falhou, sem duplicá-la. */
  tentarNovamente: () => Promise<boolean>;
  limpar: () => void;
}

// O backend não guarda a conversa e o app só a mantém em memória: ela some ao fechar o app e ao sair da conta
// (`useSessao.sair`). Limpar também invalida a resposta que ainda estiver a caminho: ela é de uma conversa que já
// não existe e não pode aparecer na seguinte.
let epoca = 0;
let contador = 0;

function novoId(): string {
  contador += 1;
  return `m-${contador}`;
}

function semPerguntaPendente(mensagens: MensagemLocal[]): MensagemLocal[] {
  const ultima = mensagens[mensagens.length - 1];
  return ultima?.falhou ? mensagens.slice(0, -1) : mensagens;
}

function marcarFalha(mensagens: MensagemLocal[]): MensagemLocal[] {
  const ultima = mensagens[mensagens.length - 1];
  if (!ultima || ultima.papel !== 'usuario') return mensagens;
  return [...mensagens.slice(0, -1), { ...ultima, falhou: true }];
}

export const useConversa = create<EstadoConversa>()((set, get) => {
  async function pedirResposta(): Promise<boolean> {
    const minhaEpoca = epoca;
    try {
      const resposta = await iaApi.conversar(montarMensagensDaApi(get().mensagens));
      if (epoca !== minhaEpoca) return false;
      const mensagem: MensagemLocal = {
        id: novoId(),
        papel: 'assistente',
        texto: resposta.texto,
        modelo: resposta.modelo,
        avisoLegal: avisoLegalDe(resposta.aviso_legal),
      };
      set((estado) => ({ mensagens: [...estado.mensagens, mensagem], enviando: false, erro: null }));
      return true;
    } catch (erro) {
      if (epoca !== minhaEpoca) return false;
      set((estado) => ({ mensagens: marcarFalha(estado.mensagens), enviando: false, erro }));
      return false;
    }
  }

  return {
    mensagens: [],
    enviando: false,
    erro: null,

    enviar: async (texto) => {
      if (get().enviando) return false;
      const validacao = validarPergunta(texto);
      if (!validacao.valida) return false;
      set((estado) => ({
        mensagens: [...semPerguntaPendente(estado.mensagens), { id: novoId(), papel: 'usuario', texto: validacao.texto }],
        enviando: true,
        erro: null,
      }));
      return pedirResposta();
    },

    tentarNovamente: async () => {
      const { mensagens, enviando } = get();
      const ultima = mensagens[mensagens.length - 1];
      if (enviando || !ultima?.falhou) return false;
      set({ mensagens: [...mensagens.slice(0, -1), { ...ultima, falhou: false }], enviando: true, erro: null });
      return pedirResposta();
    },

    limpar: () => {
      epoca += 1;
      set({ mensagens: [], enviando: false, erro: null });
    },
  };
});
