/** Raiz usada sem EXPO_PUBLIC_API_URL (simulador iOS ou prévia no PC). No celular, use o IP do PC. */
export const URL_PADRAO_DA_API = 'http://localhost:8000';

// Esquema http(s), host com porta opcional e no máximo uma barra final: sem caminho, query, fragmento ou credenciais.
const RAIZ_DO_SERVIDOR = /^(https?):\/\/([^/?#@\s]+)\/?$/i;

export class ConfiguracaoInvalidaError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ConfiguracaoInvalidaError';
  }
}

/** Valida EXPO_PUBLIC_API_URL e devolve a raiz do servidor sem barra final (o client acrescenta /api/v1). */
export function lerUrlDaApi(valor: string | undefined): string {
  const bruto = valor?.trim() || URL_PADRAO_DA_API;
  const partes = RAIZ_DO_SERVIDOR.exec(bruto);
  if (!partes) {
    throw new ConfiguracaoInvalidaError(
      `EXPO_PUBLIC_API_URL precisa ser só a raiz do servidor, como http://192.168.0.10:8000 (sem /api/v1). Valor atual: ${bruto}`,
    );
  }
  return `${partes[1].toLowerCase()}://${partes[2]}`;
}

/** Endereço do WebSocket de notificações a partir da raiz do servidor: `http` vira `ws` e `https` vira `wss`. */
export function urlDoWebSocket(raiz: string): string {
  return `${raiz.replace(/\/+$/, '').replace(/^http/i, 'ws')}/api/v1/notificacoes/ws`;
}
