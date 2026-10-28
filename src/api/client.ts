// Camada HTTP sem dependência de React Native: pode ser copiada pelo cliente web.

export type CausaFalha = 'rede' | 'tempo';

export interface DetalhesErro {
  /** X-Request-ID da chamada: localiza a requisição nos logs do backend. */
  requestId?: string;
  /** Segundos do header Retry-After (ex.: cota da IA excedida). */
  retryAfterSegundos?: number;
  /** Só com status 0: sem conexão ou tempo esgotado. */
  causa?: CausaFalha;
}

export class ApiError extends Error {
  readonly status: number;
  readonly requestId?: string;
  readonly retryAfterSegundos?: number;
  readonly causa?: CausaFalha;

  constructor(status: number, mensagem: string, detalhes: DetalhesErro = {}) {
    super(mensagem);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = detalhes.requestId;
    this.retryAfterSegundos = detalhes.retryAfterSegundos;
    this.causa = detalhes.causa;
  }
}

interface ConfigApi {
  /** Raiz do servidor, sem /api/v1 (ver src/config/ambiente.ts). */
  baseUrl: string;
  obterToken: () => string | null;
  /** Verdadeiro quando o access token vence logo: o client renova antes de usar. */
  tokenPertoDeVencer: () => boolean;
  /**
   * Resolve com o novo access token, ou com null quando a sessão acabou (refresh recusado).
   * Rejeita quando não deu para renovar (ex.: sem rede). Quem implementa garante uma renovação por vez.
   */
  renovarToken: () => Promise<string | null>;
  /**
   * Identifica a sessão atual: muda a cada login e logout, mas NÃO ao renovar o token. Uma resposta tardia de
   * uma sessão anterior nunca é repetida nem renovada com as credenciais da sessão seguinte.
   */
  geracaoDaSessao: () => number;
  timeoutMs?: number;
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type ValorQuery = string | number | boolean | undefined;

interface OpcoesRequest {
  metodo?: Metodo;
  corpo?: unknown;
  query?: Record<string, ValorQuery>;
  /** Tempo limite desta chamada (IA e a primeira coleta da watchlist demoram mais que o padrão). */
  timeoutMs?: number;
}

interface Enviada {
  resposta: Response;
  requestId: string;
}

export const TIMEOUT_PADRAO_MS = 20_000;

let config: ConfigApi | null = null;

export function configurarApi(novaConfig: ConfigApi): void {
  config = { ...novaConfig, baseUrl: novaConfig.baseUrl.replace(/\/+$/, '') };
}

/** Login, refresh e logout nunca levam Authorization nem disparam renovação. */
function rotaDeSessao(caminho: string): boolean {
  return caminho.startsWith('/auth/');
}

function montarUrl(baseUrl: string, caminho: string, query?: Record<string, ValorQuery>): string {
  const base = `${baseUrl}/api/v1${caminho}`;
  if (!query) return base;
  const partes = Object.entries(query)
    .filter((par): par is [string, string | number | boolean] => par[1] !== undefined)
    .map(([chave, valor]) => `${encodeURIComponent(chave)}=${encodeURIComponent(String(valor))}`);
  return partes.length > 0 ? `${base}?${partes.join('&')}` : base;
}

// O backend aceita até 64 caracteres em [A-Za-z0-9._-]; o prefixo identifica o cliente mobile nos logs.
function novoRequestId(): string {
  return `mob-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function lerCabecalho(resposta: Response, nome: string): string | null {
  // Respostas falsas de teste (e alguns polyfills de fetch) não trazem headers.
  return resposta.headers?.get(nome) ?? null;
}

function lerRetryAfter(resposta: Response): number | undefined {
  const valor = lerCabecalho(resposta, 'Retry-After')?.trim();
  return valor && /^\d+$/.test(valor) ? Number(valor) : undefined;
}

async function extrairMensagem(resposta: Response): Promise<string> {
  const padrao = `Erro ${resposta.status}`;
  let corpo: unknown;
  try {
    corpo = await resposta.json();
  } catch {
    return padrao;
  }
  const detail = (corpo as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const mensagens = detail
      .map((item: unknown) =>
        item !== null && typeof item === 'object' && 'msg' in item ? String((item as { msg: unknown }).msg) : null,
      )
      .filter((mensagem): mensagem is string => mensagem !== null);
    if (mensagens.length > 0) return mensagens.join('; ');
  }
  return padrao;
}

async function enviar(atual: ConfigApi, caminho: string, opcoes: OpcoesRequest, token: string | null): Promise<Enviada> {
  const requestId = novoRequestId();
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Request-ID': requestId };
  if (opcoes.corpo !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const controlador = new AbortController();
  let esgotou = false;
  const temporizador = setTimeout(
    () => {
      esgotou = true;
      controlador.abort();
    },
    opcoes.timeoutMs ?? atual.timeoutMs ?? TIMEOUT_PADRAO_MS,
  );

  try {
    const resposta = await fetch(montarUrl(atual.baseUrl, caminho, opcoes.query), {
      method: opcoes.metodo ?? 'GET',
      headers,
      body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
      signal: controlador.signal,
    });
    return { resposta, requestId };
  } catch {
    throw esgotou
      ? new ApiError(0, `O servidor demorou demais para responder (${atual.baseUrl})`, { causa: 'tempo', requestId })
      : new ApiError(0, `Sem conexão com o servidor (${atual.baseUrl})`, { causa: 'rede', requestId });
  } finally {
    clearTimeout(temporizador);
  }
}

async function interpretar<T>({ resposta, requestId }: Enviada): Promise<T> {
  const id = lerCabecalho(resposta, 'X-Request-ID') ?? requestId;
  if (!resposta.ok) {
    throw new ApiError(resposta.status, await extrairMensagem(resposta), {
      requestId: id,
      retryAfterSegundos: lerRetryAfter(resposta),
    });
  }
  if (resposta.status === 204) return undefined as T;
  try {
    return (await resposta.json()) as T;
  } catch {
    throw new ApiError(0, 'Resposta inválida do servidor', { requestId: id });
  }
}

/**
 * Renovação antes de enviar. Se falhar rápido (sem rede, 5xx), tenta com o token atual: o servidor decide se ainda
 * vale. Se estourar o tempo limite, o servidor não responde: enviar a requisição só dobraria a espera.
 */
async function renovarAntesDeEnviar(atual: ConfigApi, token: string): Promise<string> {
  let novo: string | null;
  try {
    novo = await atual.renovarToken();
  } catch (erro) {
    if (erro instanceof ApiError && erro.causa === 'tempo') throw erro;
    return token;
  }
  if (novo === null) throw new ApiError(401, 'Sessão encerrada. Entre novamente.');
  return novo;
}

/** Depois de um 401: se outra requisição já renovou (ou a sessão acabou), usa o token vigente; senão renova agora. */
async function tokenParaRepetir(atual: ConfigApi, tokenUsado: string): Promise<string | null> {
  const vigente = atual.obterToken();
  if (vigente !== tokenUsado) return vigente;
  return atual.renovarToken();
}

export async function request<T>(caminho: string, opcoes: OpcoesRequest = {}): Promise<T> {
  if (!config) throw new Error('configurarApi() precisa ser chamada antes de request()');
  const atual = config;
  const geracao = atual.geracaoDaSessao();

  let token = rotaDeSessao(caminho) ? null : atual.obterToken();
  if (token && atual.tokenPertoDeVencer()) token = await renovarAntesDeEnviar(atual, token);

  let enviada = await enviar(atual, caminho, opcoes, token);
  // Só repete se a sessão continua a mesma: depois de logout e novo login o 401 é de outro usuário e vai para quem
  // chamou (repetir mandaria uma escrita com as credenciais da conta seguinte).
  if (enviada.resposta.status === 401 && token && atual.geracaoDaSessao() === geracao) {
    // Uma única repetição: um segundo 401, já com o token novo, vai direto para quem chamou.
    const novo = await tokenParaRepetir(atual, token);
    if (novo && atual.geracaoDaSessao() === geracao) enviada = await enviar(atual, caminho, opcoes, novo);
  }
  return interpretar<T>(enviada);
}
