import type { Notificacao } from '@/api/tipos';

/** Cliente do WebSocket de notificações (protocolo: docs/MAPEAMENTO.md §6.2). Sem React nem React Native. */

export type EstadoTempoReal = 'desconectado' | 'conectando' | 'conectado';

export const CODIGO_NAO_AUTENTICADO = 4401;
export const ESPERA_MINIMA_MS = 1_000;
export const ESPERA_MAXIMA_MS = 30_000;
/** Três pings (30 s) sem chegar nada: a conexão é considerada morta. */
export const SILENCIO_MAXIMO_MS = 90_000;
/** Renova o token (e reautentica) quando faltar menos que isto para vencer. */
export const MARGEM_RENOVACAO_MS = 60_000;
/**
 * Tempo de conexão autenticada para a espera da reconexão voltar ao mínimo (um intervalo de ping). Zerar já no
 * `autenticado` faria um servidor que autentica e cai logo depois ser martelado sem espera crescente.
 */
export const ESTABILIDADE_MS = 30_000;
const ESPERA_MINIMA_DA_REAUTENTICACAO_MS = 5_000;
const RENOVACOES_SEGUIDAS_POR_4401 = 3;

/** Subconjunto do `WebSocket` que o cliente usa (injetável nos testes). */
export interface SocketLike {
  send: (dados: string) => void;
  close: () => void;
  onopen: (() => void) | null;
  onmessage: ((evento: { data: unknown }) => void) | null;
  onclose: ((evento: { code: number }) => void) | null;
  onerror: (() => void) | null;
}

export interface OpcoesTempoReal {
  url: string;
  obterToken: () => string | null;
  /** Epoch em ms em que o access token vence. */
  obterExpiracao: () => number | null;
  /** Novo access token; null quando a sessão acabou; rejeita sem rede. */
  renovarToken: () => Promise<string | null>;
  aoNotificacao: (notificacao: Notificacao) => void;
  /** Primeira autenticação de cada conexão: é o momento de sincronizar o que chegou com ela caída. */
  aoAutenticar: () => void;
  aoMudarEstado?: (estado: EstadoTempoReal) => void;
  criarSocket?: (url: string) => SocketLike;
  agora?: () => number;
}

export interface ClienteTempoReal {
  /** Abre a conexão. Devolve `false` se já estava ativa. */
  conectar: () => boolean;
  /** Fecha e deixa de reconectar. */
  desconectar: () => void;
}

interface MensagemRecebida {
  tipo?: unknown;
  notificacao?: unknown;
}

function lerMensagem(dados: unknown): MensagemRecebida | null {
  if (typeof dados !== 'string') return null;
  try {
    const mensagem = JSON.parse(dados) as unknown;
    return typeof mensagem === 'object' && mensagem !== null ? (mensagem as MensagemRecebida) : null;
  } catch {
    return null;
  }
}

export function criarClienteTempoReal(opcoes: OpcoesTempoReal): ClienteTempoReal {
  const criarSocket = opcoes.criarSocket ?? ((url: string) => new WebSocket(url) as unknown as SocketLike);
  const agora = opcoes.agora ?? Date.now;

  let ativo = false;
  let socket: SocketLike | null = null;
  // Invalida os callbacks de sockets descartados: eventos tardios do socket antigo não tocam o atual.
  let geracao = 0;
  let tentativas = 0;
  let falhas4401 = 0;
  let estado: EstadoTempoReal = 'desconectado';
  let temporizadorReconexao: ReturnType<typeof setTimeout> | null = null;
  let temporizadorSilencio: ReturnType<typeof setTimeout> | null = null;
  let temporizadorRenovacao: ReturnType<typeof setTimeout> | null = null;
  let temporizadorEstavel: ReturnType<typeof setTimeout> | null = null;

  function mudarEstado(novo: EstadoTempoReal) {
    if (novo === estado) return;
    estado = novo;
    opcoes.aoMudarEstado?.(novo);
  }

  function limpar(temporizador: ReturnType<typeof setTimeout> | null) {
    if (temporizador) clearTimeout(temporizador);
  }

  function descartarSocket() {
    geracao += 1;
    limpar(temporizadorSilencio);
    limpar(temporizadorRenovacao);
    limpar(temporizadorEstavel);
    temporizadorSilencio = null;
    temporizadorRenovacao = null;
    temporizadorEstavel = null;
    const antigo = socket;
    socket = null;
    if (antigo) {
      antigo.onopen = null;
      antigo.onmessage = null;
      antigo.onclose = null;
      antigo.onerror = null;
      try {
        antigo.close();
      } catch {
        // Já estava fechado.
      }
    }
  }

  function agendarReconexao() {
    if (!ativo) return;
    mudarEstado('conectando');
    const espera = Math.min(ESPERA_MINIMA_MS * 2 ** tentativas, ESPERA_MAXIMA_MS);
    tentativas += 1;
    limpar(temporizadorReconexao);
    temporizadorReconexao = setTimeout(() => {
      temporizadorReconexao = null;
      abrir();
    }, espera);
  }

  function reiniciarSilencio(minha: number) {
    limpar(temporizadorSilencio);
    temporizadorSilencio = setTimeout(() => {
      if (minha !== geracao) return;
      descartarSocket();
      agendarReconexao();
    }, SILENCIO_MAXIMO_MS);
  }

  /** Token em uso, renovado antes se estiver para vencer. null = sessão acabou. Rejeita sem rede. */
  async function obterTokenValido(): Promise<string | null> {
    const token = opcoes.obterToken();
    const expiraEm = opcoes.obterExpiracao();
    const vencendo = expiraEm !== null && expiraEm - agora() <= MARGEM_RENOVACAO_MS;
    if (token && !vencendo) return token;
    return opcoes.renovarToken();
  }

  async function enviarAutenticar(minha: number) {
    try {
      const token = await obterTokenValido();
      if (minha !== geracao) return;
      if (!token) {
        desconectar();
        return;
      }
      socket?.send(JSON.stringify({ tipo: 'autenticar', token }));
    } catch {
      if (minha !== geracao) return;
      descartarSocket();
      agendarReconexao();
    }
  }

  function agendarReautenticacao(minha: number) {
    limpar(temporizadorRenovacao);
    const expiraEm = opcoes.obterExpiracao();
    if (expiraEm === null) return;
    const espera = Math.max(expiraEm - agora() - MARGEM_RENOVACAO_MS, ESPERA_MINIMA_DA_REAUTENTICACAO_MS);
    temporizadorRenovacao = setTimeout(() => void enviarAutenticar(minha), espera);
  }

  async function renovarEReconectar() {
    mudarEstado('conectando');
    const minha = geracao;
    try {
      const token = await opcoes.renovarToken();
      if (!ativo || minha !== geracao) return;
      if (!token) {
        desconectar();
        return;
      }
      abrir();
    } catch {
      if (!ativo || minha !== geracao) return;
      agendarReconexao();
    }
  }

  function aoFechar(codigo: number) {
    descartarSocket();
    if (!ativo) return;
    if (codigo === CODIGO_NAO_AUTENTICADO) {
      falhas4401 += 1;
      if (falhas4401 <= RENOVACOES_SEGUIDAS_POR_4401) {
        void renovarEReconectar();
        return;
      }
    }
    agendarReconexao();
  }

  function abrir() {
    if (!ativo) return;
    descartarSocket();
    mudarEstado('conectando');
    const minha = geracao;
    let primeiraAutenticacao = true;
    const novo = criarSocket(opcoes.url);
    socket = novo;

    novo.onopen = () => {
      if (minha !== geracao) return;
      reiniciarSilencio(minha);
      void enviarAutenticar(minha);
    };
    novo.onmessage = (evento) => {
      if (minha !== geracao) return;
      reiniciarSilencio(minha);
      const mensagem = lerMensagem(evento.data);
      if (!mensagem) return;
      if (mensagem.tipo === 'autenticado') {
        limpar(temporizadorEstavel);
        temporizadorEstavel = setTimeout(() => {
          tentativas = 0;
          falhas4401 = 0;
        }, ESTABILIDADE_MS);
        mudarEstado('conectado');
        agendarReautenticacao(minha);
        if (primeiraAutenticacao) {
          primeiraAutenticacao = false;
          opcoes.aoAutenticar();
        }
      } else if (mensagem.tipo === 'notificacao' && typeof mensagem.notificacao === 'object' && mensagem.notificacao) {
        opcoes.aoNotificacao(mensagem.notificacao as Notificacao);
      }
    };
    novo.onclose = (evento) => {
      if (minha !== geracao) return;
      aoFechar(evento.code);
    };
    novo.onerror = () => {
      // O fechamento vem logo depois e é tratado em onclose.
    };
  }

  function desconectar() {
    ativo = false;
    limpar(temporizadorReconexao);
    temporizadorReconexao = null;
    descartarSocket();
    mudarEstado('desconectado');
  }

  function conectar(): boolean {
    if (ativo) return false;
    ativo = true;
    tentativas = 0;
    falhas4401 = 0;
    abrir();
    return true;
  }

  return { conectar, desconectar };
}
