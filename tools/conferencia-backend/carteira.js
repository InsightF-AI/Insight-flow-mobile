// Conferência dos erros 422 e das escalas da carteira contra o backend local.
// Uso: node carteira.js
// Usuário descartável no banco LOCAL; o token fica só em memória e nunca é impresso.
const BASE = 'http://localhost:8000/api/v1';

async function http(metodo, caminho, corpo, token) {
  const r = await fetch(BASE + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(120000),
  });
  const texto = await r.text();
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {}
  return { status: r.status, json };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ok = (cond, msg, extra = '') => console.log(`${cond ? 'OK  ' : 'FALHA'} ${msg}${extra ? ' — ' + extra : ''}`);

(async () => {
  const sufixo = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const cad = await http('POST', '/usuarios', { nome: 'Carteira E6', email: `carteira-e6-${sufixo}@example.com`, senha: `Cart-${sufixo}-Tura!9` });
  const token = cad.json?.access_token;
  if (!token) throw new Error(`cadastro falhou: ${cad.status}`);

  const add = await http('POST', '/watchlist', { ticker: 'PETR4' }, token);
  const ativoId = add.json?.ativo?.id;
  ok(add.status === 201 && ativoId, 'PETR4 na watchlist', String(add.status));

  const hoje = new Date();
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const futura = new Date(hoje.getTime() + 3 * 86400000);

  // (a) data futura
  const a = await http('POST', '/operacoes', { ativo_id: ativoId, tipo: 'COMPRA', quantidade: '1', preco_unitario: '10', data: iso(futura) }, token);
  ok(a.status === 422 && a.json?.detail === 'data nao pode ser futura', 'data futura → 422 "data nao pode ser futura"', `${a.status} ${JSON.stringify(a.json?.detail)}`);

  // (b) venda sem posição
  const b = await http('POST', '/operacoes', { ativo_id: ativoId, tipo: 'VENDA', quantidade: '1', preco_unitario: '10', data: iso(hoje) }, token);
  ok(b.status === 422 && typeof b.json?.detail === 'string' && UUID.test(b.json.detail), 'venda sem posição → 422 com o UUID do ativo no detail', `${b.status}`);

  // (c) compra, venda parcial, remover a compra
  const compra = await http('POST', '/operacoes', { ativo_id: ativoId, tipo: 'COMPRA', quantidade: '10', preco_unitario: '30', data: '2026-09-01' }, token);
  ok(compra.status === 201, 'compra registrada', String(compra.status));
  const venda = await http('POST', '/operacoes', { ativo_id: ativoId, tipo: 'VENDA', quantidade: '4', preco_unitario: '33', data: '2026-09-15' }, token);
  ok(venda.status === 201, 'venda parcial registrada', String(venda.status));
  const del = await http('DELETE', `/operacoes/${compra.json?.id}`, null, token);
  ok(del.status === 422 && typeof del.json?.detail === 'string' && UUID.test(del.json.detail), 'remover a compra com venda posterior → 422 com UUID', String(del.status));

  // (d) escalas
  const rent = await http('GET', '/portfolio/rentabilidade', null, token);
  console.log('rentabilidade:', JSON.stringify(rent.json));
  ok(Math.abs(Number(rent.json?.percentual)) < 5, 'percentual da rentabilidade está em fração (|x| < 5)', String(rent.json?.percentual));
  for (const b2 of ['CDI', 'IBOVESPA']) {
    const bm = await http('GET', `/portfolio/benchmark?benchmark=${b2}`, null, token);
    console.log(`benchmark ${b2}:`, bm.status, JSON.stringify(bm.json));
  }

  // (e) posições
  const pos = await http('GET', '/portfolio/posicoes', null, token);
  console.log('posicoes campos:', pos.json?.[0] ? Object.keys(pos.json[0]).sort().join(',') : '(vazio)');
  ok(pos.json?.[0] && !('moeda' in pos.json[0]) && !('tipo' in pos.json[0]), 'posição não traz moeda nem tipo (por isso o filtro usa a watchlist)');

  // (f) operações só com ativo_id
  const ops = await http('GET', '/operacoes', null, token);
  ok(ops.json?.[0] && !('ticker' in ops.json[0]), 'operação só traz ativo_id (sem ticker)');

  // (g) saldo que o app calcula = quantidade da posição
  const saldo = (ops.json ?? []).reduce((s, o) => s + (o.tipo === 'COMPRA' ? 1 : -1) * Number(o.quantidade), 0);
  ok(pos.json?.[0] ? Math.abs(saldo - Number(pos.json[0].quantidade)) < 1e-8 : saldo === 6, 'saldo das operações = quantidade da posição', `saldo ${saldo}`);
})().catch((e) => {
  console.error('FALHOU', e.message);
  process.exit(1);
});
