// Conferência dos contratos de IA (análise e chat) contra o backend local.
// Uso: node ia.js desligada   → backend sem chave de IA (503 esperado)
//      node ia.js stub        → backend apontado para o Gemini falso de tools/ia-falsa (200, 429, guardrail, limites)
// Usuário descartável no banco LOCAL; o token fica só em memória e nunca é impresso.
const BASE = 'http://localhost:8000/api/v1';
const modo = process.argv[2] ?? 'desligada';

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
  return { status: r.status, json, retryAfter: r.headers.get('retry-after') };
}

let falhas = 0;
const ok = (cond, msg, extra = '') => {
  if (!cond) falhas += 1;
  console.log(`${cond ? 'OK   ' : 'FALHA'} ${msg}${extra ? ' — ' + extra : ''}`);
};
const u = (texto) => ({ papel: 'usuario', texto });
const a = (texto) => ({ papel: 'assistente', texto });

(async () => {
  const sufixo = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const cad = await http('POST', '/usuarios', { nome: 'IA E7', email: `ia-e7-${sufixo}@example.com`, senha: `Ia-${sufixo}-Tura!9` });
  const token = cad.json?.access_token;
  if (!token) throw new Error(`cadastro falhou: ${cad.status}`);

  const add = await http('POST', '/watchlist', { ticker: 'PETR4' }, token);
  const ativoId = add.json?.ativo?.id;
  ok(add.status === 201 && ativoId, 'PETR4 na watchlist', String(add.status));

  if (modo === 'desligada') {
    const an = await http('GET', `/ativos/${ativoId}/analise`, null, token);
    ok(an.status === 503 && an.json?.detail === 'Provedor de IA indisponivel', 'análise com IA desligada → 503 "Provedor de IA indisponivel"', `${an.status} ${JSON.stringify(an.json?.detail)}`);

    const ch = await http('POST', '/chat', { mensagens: [u('Qual foi meu ativo mais rentável?')] }, token);
    ok(ch.status === 503 && ch.json?.detail === 'Provedor de IA indisponivel', 'chat com IA desligada → 503 "Provedor de IA indisponivel"', `${ch.status} ${JSON.stringify(ch.json?.detail)}`);

    const sem = await http('GET', `/ativos/${ativoId}/analise`);
    ok(sem.status === 401 || sem.status === 403, 'análise sem token é recusada', String(sem.status));
    return;
  }

  // ---- modo stub: Gemini falso (ver tools/ia-falsa) ----
  const an1 = await http('GET', `/ativos/${ativoId}/analise`, null, token);
  console.log('analise #1:', JSON.stringify({ ...an1.json, texto: String(an1.json?.texto).slice(0, 60) }));
  ok(an1.status === 200 && an1.json?.em_cache === false && an1.json?.desatualizada === false, 'análise nova → 200, em_cache false, desatualizada false', String(an1.status));
  ok(typeof an1.json?.aviso_legal === 'string' && an1.json.aviso_legal.length > 0, 'análise traz aviso_legal', an1.json?.aviso_legal);
  ok(an1.json?.ativo_id === ativoId && typeof an1.json?.modelo === 'string' && !Number.isNaN(Date.parse(an1.json?.gerado_em)), 'campos ativo_id, modelo e gerado_em');

  const an2 = await http('GET', `/ativos/${ativoId}/analise`, null, token);
  ok(an2.status === 200 && an2.json?.em_cache === true, 'segunda análise sem mudança de dados → em_cache true', `${an2.status} em_cache=${an2.json?.em_cache}`);

  const c1 = await http('POST', '/chat', { mensagens: [u('Qual foi meu ativo mais rentável?')] }, token);
  console.log('chat #1:', JSON.stringify({ ...c1.json, texto: String(c1.json?.texto).slice(0, 60) }));
  ok(c1.status === 200 && typeof c1.json?.texto === 'string' && c1.json.texto.length > 0, 'chat → 200 com texto', String(c1.status));
  ok(typeof c1.json?.aviso_legal === 'string' && c1.json.aviso_legal.length > 0 && typeof c1.json?.modelo === 'string', 'chat traz modelo e aviso_legal');

  const c2 = await http('POST', '/chat', { mensagens: [u('Oi'), a(c1.json?.texto ?? 'ok'), u('E o setor?')] }, token);
  ok(c2.status === 200, 'chat com histórico de 3 mensagens → 200', String(c2.status));

  // limites (a validação vem antes do provedor)
  const lim = [
    ['lista vazia', { mensagens: [] }, 'Envie ao menos uma mensagem'],
    ['21 mensagens', { mensagens: Array.from({ length: 21 }, (_, i) => (i % 2 === 0 ? u(`p${i}`) : a(`r${i}`))) }, 'Limite de 20 mensagens excedido'],
    ['última do assistente', { mensagens: [u('Oi'), a('Olá')] }, 'A ultima mensagem deve ser do usuario'],
    ['texto em branco', { mensagens: [u('   ')] }, 'Mensagem vazia'],
    ['pergunta de 2001 caracteres', { mensagens: [u('x'.repeat(2001))] }, 'Mensagem excede 2000 caracteres'],
    ['resposta da IA de 2001 caracteres no histórico', { mensagens: [u('Oi'), a('r'.repeat(2001)), u('E?')] }, 'Mensagem excede 2000 caracteres'],
  ];
  for (const [nome, corpo, esperado] of lim) {
    const r = await http('POST', '/chat', corpo, token);
    ok(r.status === 422 && r.json?.detail === esperado, `${nome} → 422 "${esperado}"`, `${r.status} ${JSON.stringify(r.json?.detail)}`);
  }
  const cortado = await http('POST', '/chat', { mensagens: [u('Oi'), a('r'.repeat(2000)), u('E?')] }, token);
  ok(cortado.status === 200, 'o mesmo histórico com a resposta cortada em 2000 → 200', String(cortado.status));
  const exato = await http('POST', '/chat', { mensagens: [u('x'.repeat(2000))] }, token);
  ok(exato.status === 200, 'pergunta de exatamente 2000 caracteres → 200', String(exato.status));
  const vinte = await http('POST', '/chat', { mensagens: Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? u(`p${i}`) : a(`r${i}`))).slice(0, 19).concat([u('final')]) }, token);
  ok(vinte.status === 200, '20 mensagens (a última do usuário) → 200', String(vinte.status));

  // cenários do Gemini falso, selecionados pelo texto da pergunta
  const cota = await http('POST', '/chat', { mensagens: [u('#cota')] }, token);
  ok(cota.status === 503 && cota.json?.detail === 'Cota do provedor de IA excedida', 'cota do provedor → 503 "Cota do provedor de IA excedida"', `${cota.status} ${JSON.stringify(cota.json?.detail)}`);
  ok(cota.retryAfter === '37', 'header Retry-After chega ao cliente', String(cota.retryAfter));

  const guard = await http('POST', '/chat', { mensagens: [u('#guardrail')] }, token);
  ok(guard.status === 502 && guard.json?.detail === 'Resposta da IA bloqueada pelo guardrail', 'texto com recomendação → 502 do guardrail', `${guard.status} ${JSON.stringify(guard.json?.detail)}`);
})()
  .catch((e) => {
    console.error('FALHOU', e.message);
    falhas += 1;
  })
  .finally(() => {
    console.log(falhas === 0 ? '\nTUDO CONFERIDO' : `\n${falhas} FALHA(S)`);
    process.exit(falhas === 0 ? 0 : 1);
  });
