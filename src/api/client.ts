// Camada HTTP sem dependência de React Native: pode ser copiada pelo cliente web.

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface ConfigApi {
  baseUrl: string;
  obterToken: () => string | null;
  aoNaoAutorizado: () => void;
  timeoutMs?: number;
}

type Metodo = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type ValorQuery = string | number | boolean | undefined;

interface OpcoesRequest {
  metodo?: Metodo;
  corpo?: unknown;
  query?: Record<string, ValorQuery>;
}

const TIMEOUT_PADRAO_MS = 15_000;

let config: ConfigApi | null = null;

export function configurarApi(novaConfig: ConfigApi): void {
  config = novaConfig;
}

function montarUrl(baseUrl: string, caminho: string, query?: Record<string, ValorQuery>): string {
  const base = `${baseUrl.replace(/\/+$/, '')}/api/v1${caminho}`;
  if (!query) return base;
  const partes = Object.entries(query)
    .filter((par): par is [string, string | number | boolean] => par[1] !== undefined)
    .map(([chave, valor]) => `${encodeURIComponent(chave)}=${encodeURIComponent(String(valor))}`);
  return partes.length > 0 ? `${base}?${partes.join('&')}` : base;
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

export async function request<T>(caminho: string, opcoes: OpcoesRequest = {}): Promise<T> {
  if (!config) throw new Error('configurarApi() precisa ser chamada antes de request()');
  const { baseUrl, obterToken, aoNaoAutorizado, timeoutMs = TIMEOUT_PADRAO_MS } = config;

  const token = obterToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opcoes.corpo !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);

  const resposta = await fetch(montarUrl(baseUrl, caminho, opcoes.query), {
    method: opcoes.metodo ?? 'GET',
    headers,
    body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
    signal: controlador.signal,
  })
    .catch(() => {
      throw new ApiError(0, 'Sem conexão com o servidor');
    })
    .finally(() => clearTimeout(temporizador));

  // Um 401 tardio de uma sessão anterior não pode derrubar a sessão nova.
  if (resposta.status === 401 && token && obterToken() === token) aoNaoAutorizado();
  if (!resposta.ok) throw new ApiError(resposta.status, await extrairMensagem(resposta));
  if (resposta.status === 204) return undefined as T;
  try {
    return (await resposta.json()) as T;
  } catch {
    throw new ApiError(0, 'Resposta inválida do servidor');
  }
}
