// Conferência dos contratos de /dispositivos e /health contra o backend local.
// Uso: node dispositivos.js
// Usuários descartáveis no banco LOCAL; os tokens ficam só em memória e nunca são impressos.
const RAIZ = 'http://localhost:8000';
const BASE = `${RAIZ}/api/v1`;

async function http(metodo, caminho, corpo, token, raiz = BASE) {
  const r = await fetch(raiz + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  const texto = await r.text();
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {}
  return { status: r.status, json };
}

let falhas = 0;
const ok = (cond, msg, extra = '') => {
  if (!cond) falhas += 1;
  console.log(`${cond ? 'OK   ' : 'FALHA'} ${msg}${extra ? ' — ' + extra : ''}`);
};

async function criarUsuario(rotulo) {
  const s = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const r = await http('POST', '/usuarios', { nome: `Disp ${rotulo}`, email: `disp-e8-${rotulo}-${s}@example.com`, senha: `Disp-${s}-Tura!9` });
  if (!r.json?.access_token) throw new Error(`cadastro ${rotulo} falhou: ${r.status}`);
  return r.json.access_token;
}

(async () => {
  const saude = await http('GET', '/health', null, null, RAIZ);
  ok(saude.status === 200 && saude.json?.status === 'ok', 'GET /health (sem login, na raiz) → 200 {"status":"ok"}', `${saude.status} ${JSON.stringify(saude.json)}`);

  const a = await criarUsuario('a');
  const b = await criarUsuario('b');
  const sufixo = `${Date.now()}`;
  const token = `ExponentPushToken[e8-${sufixo}]`;
  const codificado = encodeURIComponent(token);

  const sem = await http('POST', '/dispositivos', { token });
  ok(sem.status === 401 || sem.status === 403, 'registrar sem login é recusado', String(sem.status));

  const r1 = await http('POST', '/dispositivos', { token }, a);
  ok(r1.status === 201 && r1.json?.token === token && r1.json?.ativo === true, 'primeiro registro → 201 {token, ativo: true}', String(r1.status));
  const r2 = await http('POST', '/dispositivos', { token }, a);
  ok(r2.status === 200 && r2.json?.ativo === true, 'registrar de novo → 200 (já existia)', String(r2.status));
  const r3 = await http('POST', '/dispositivos', { token }, b);
  ok(r3.status === 200, 'o mesmo token por outra conta passa para ela → 200', String(r3.status));

  const variante = await http('POST', '/dispositivos', { token: `ExpoPushToken[e8v-${sufixo}]` }, a);
  ok(variante.status === 201, 'forma ExpoPushToken[...] também vale → 201', String(variante.status));

  for (const [rotulo, invalido] of [
    ['texto qualquer', 'abc'],
    ['vazio', ''],
    ['256 caracteres', `ExponentPushToken[${'x'.repeat(256)}]`],
  ]) {
    const r = await http('POST', '/dispositivos', { token: invalido }, a);
    ok(r.status === 422 && r.json?.detail === 'Token de push invalido', `token inválido (${rotulo}) → 422 "Token de push invalido"`, `${r.status} ${JSON.stringify(r.json?.detail)}`);
  }

  const d1 = await http('DELETE', `/dispositivos?token=${codificado}`, null, b);
  ok(d1.status === 204, 'DELETE com o token codificado → 204', String(d1.status));
  const d2 = await http('DELETE', `/dispositivos?token=${codificado}`, null, b);
  ok(d2.status === 204, 'DELETE repetido → 204 (idempotente)', String(d2.status));
  const d3 = await http('DELETE', `/dispositivos?token=${encodeURIComponent('ExponentPushToken[nunca-registrado]')}`, null, a);
  ok(d3.status === 204, 'DELETE de token desconhecido → 204', String(d3.status));
})()
  .catch((e) => {
    console.error('FALHOU', e.message);
    falhas += 1;
  })
  .finally(() => {
    console.log(falhas === 0 ? '\nTUDO CONFERIDO' : `\n${falhas} FALHA(S)`);
    process.exit(falhas === 0 ? 0 : 1);
  });
