// Teste de conexão do Perfil: `/health` fica na raiz do servidor (fora de /api/v1) e não exige login.
export type ResultadoDaConexao =
  | { ok: true; ms: number }
  | { ok: false; motivo: 'rede' | 'tempo' | 'servidor'; status?: number };

export const TIMEOUT_DA_CONEXAO_MS = 5_000;

export async function testarConexao(baseUrl: string, timeoutMs: number = TIMEOUT_DA_CONEXAO_MS): Promise<ResultadoDaConexao> {
  const controlador = new AbortController();
  let esgotou = false;
  const temporizador = setTimeout(() => {
    esgotou = true;
    controlador.abort();
  }, timeoutMs);
  const inicio = Date.now();
  try {
    const resposta = await fetch(`${baseUrl.replace(/\/+$/, '')}/health`, { method: 'GET', signal: controlador.signal });
    if (!resposta.ok) return { ok: false, motivo: 'servidor', status: resposta.status };
    return { ok: true, ms: Date.now() - inicio };
  } catch {
    return { ok: false, motivo: esgotou ? 'tempo' : 'rede' };
  } finally {
    clearTimeout(temporizador);
  }
}
