// Conferência do protocolo do WebSocket de notificações contra o backend local.
// node websocket.js protocolo   -> autenticar, ping, reautenticar, 4401
// node websocket.js entrega     -> cria alerta já satisfeito e espera a notificação chegar pelo WebSocket
// O usuário é descartável (banco local); o token fica só em memória e nunca é impresso.
const BASE = 'http://localhost:8000/api/v1';
const WS = 'ws://localhost:8000/api/v1/notificacoes/ws';
const modo = process.argv[2] ?? 'protocolo';

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

async function novoUsuario() {
  const sufixo = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `ws-etapa5-${sufixo}@example.com`;
  const r = await http('POST', '/usuarios', { nome: 'WS Etapa 5', email, senha: `Ws-${sufixo}-Tura!9` });
  if (!r.json?.access_token) throw new Error(`cadastro falhou: ${r.status}`);
  return r.json;
}

function abrir(rotulo) {
  const socket = new WebSocket(WS);
  const mensagens = [];
  const esperas = [];
  let fechamento = null;
  socket.onmessage = (e) => {
    const m = JSON.parse(e.data);
    mensagens.push(m);
    esperas.slice().forEach((f) => f());
  };
  socket.onclose = (e) => {
    fechamento = e.code;
    esperas.slice().forEach((f) => f());
  };
  const esperar = (predicado, ms) =>
    new Promise((resolve, reject) => {
      const t0 = Date.now();
      const checar = () => {
        const achou = predicado();
        if (achou) {
          const i = esperas.indexOf(checar);
          if (i >= 0) esperas.splice(i, 1);
          clearTimeout(timer);
          resolve(achou);
        }
      };
      const timer = setTimeout(() => {
        const i = esperas.indexOf(checar);
        if (i >= 0) esperas.splice(i, 1);
        reject(new Error(`${rotulo}: tempo esgotado (${Date.now() - t0} ms)`));
      }, ms);
      esperas.push(checar);
      checar();
    });
  const aberto = new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = () => reject(new Error(`${rotulo}: erro ao abrir`));
  });
  return { socket, mensagens, esperar, aberto, fechamento: () => fechamento };
}

async function protocolo() {
  const usuario = await novoUsuario();
  const a = abrir('A');
  await a.aberto;
  a.socket.send(JSON.stringify({ tipo: 'autenticar', token: usuario.access_token }));
  await a.esperar(() => a.mensagens.some((m) => m.tipo === 'autenticado'), 10000);
  console.log('OK  autenticar -> autenticado');

  a.socket.send(JSON.stringify({ tipo: 'autenticar', token: usuario.access_token }));
  await a.esperar(() => a.mensagens.filter((m) => m.tipo === 'autenticado').length >= 2, 10000);
  console.log('OK  reautenticação na mesma conexão -> autenticado');

  const t0 = Date.now();
  await a.esperar(() => a.mensagens.some((m) => m.tipo === 'ping'), 40000);
  console.log(`OK  ping recebido em ${Math.round((Date.now() - t0) / 1000)} s`);
  a.socket.close();

  const b = abrir('B');
  await b.aberto;
  b.socket.send(JSON.stringify({ tipo: 'autenticar', token: 'token-invalido' }));
  await b.esperar(() => b.fechamento() !== null, 10000);
  console.log(`OK  token inválido -> fecha com ${b.fechamento()}`);

  const c = abrir('C');
  await c.aberto;
  await c.esperar(() => c.fechamento() !== null, 15000);
  console.log(`OK  sem autenticar em 10 s -> fecha com ${c.fechamento()}`);
}

async function entrega() {
  const usuario = await novoUsuario();
  const ws = abrir('E');
  await ws.aberto;
  ws.socket.send(JSON.stringify({ tipo: 'autenticar', token: usuario.access_token }));
  await ws.esperar(() => ws.mensagens.some((m) => m.tipo === 'autenticado'), 10000);
  const add = await http('POST', '/watchlist', { ticker: 'BTC' }, usuario.access_token);
  console.log('watchlist BTC:', add.status);
  const alerta = await http('POST', '/alertas', { ticker: 'BTC', tipo_condicao: 'PRECO_MAIOR_IGUAL', valor_alvo: '1' }, usuario.access_token);
  console.log('alerta já satisfeito criado:', alerta.status);
  const inicio = Date.now();
  const n = await ws.esperar(() => ws.mensagens.find((m) => m.tipo === 'notificacao'), 8 * 60 * 1000);
  console.log(`OK  notificação recebida em ${Math.round((Date.now() - inicio) / 1000)} s`);
  const x = n.notificacao;
  console.log('envelope:', JSON.stringify({ tipo: n.tipo, campos: Object.keys(x).sort(), tipoNotificacao: x.tipo, lida: x.lida, temAtivoId: Boolean(x.ativo_id) }));
  console.log('mensagem:', x.mensagem);
  ws.socket.close();
}

(modo === 'entrega' ? entrega() : protocolo())
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error('FALHOU', erro.message);
    process.exit(1);
  });
