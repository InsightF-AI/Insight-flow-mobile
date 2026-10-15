// Percurso da prévia web contra o backend local: cadastro → watchlist → detalhe → carteira → alertas → chat → perfil.
// Uso (na raiz do projeto, com a prévia em http://localhost:8081): node tools/previa-web/roteiros/cadastro-e-telas.js
// Com a IA desligada no backend. As capturas vão para ./capturas. Variáveis: CHROME_PATH, PREVIA_URL.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const SAIDA = path.join(process.cwd(), 'capturas');
fs.mkdirSync(SAIDA, { recursive: true });
const URL = process.env.PREVIA_URL || 'http://localhost:8081';
const sufixo = `${Date.now()}`.slice(-8);
const EMAIL = `previa-${sufixo}@example.com`;
const SENHA = `Previa-${sufixo}-Tura!9`;

const resultados = [];
const dialogos = [];
const errosDoConsole = [];
let contador = 0;
let pagina;

async function captura(nome) {
  contador += 1;
  const arquivo = `${String(contador).padStart(2, '0')}-${nome}.png`;
  await pagina.screenshot({ path: path.join(SAIDA, arquivo), fullPage: true });
  return arquivo;
}

async function passo(nome, fn) {
  try {
    await fn();
    const arquivo = await captura(nome.replace(/[^a-z0-9]+/gi, '-').toLowerCase());
    resultados.push(`OK    ${nome} (${arquivo})`);
  } catch (erro) {
    let arquivo = '';
    try {
      arquivo = await captura(`FALHA-${nome.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`);
    } catch {}
    resultados.push(`FALHA ${nome} — ${String(erro.message).split('\n')[0].slice(0, 200)} (${arquivo})`);
  }
}

const botao = (nome, opcoes = {}) => pagina.getByRole('button', { name: nome, ...opcoes }).first();
const texto = (t, opcoes = {}) => pagina.getByText(t, { exact: false, ...opcoes }).first();

async function esperarTexto(t, ms = 15000) {
  await pagina.getByText(t, { exact: false }).first().waitFor({ state: 'visible', timeout: ms });
}

async function abrirAba(nome) {
  const candidatos = [
    pagina.getByRole('tab', { name: nome }),
    pagina.getByRole('link', { name: nome }),
    pagina.getByRole('button', { name: nome }),
  ];
  for (const c of candidatos) {
    if ((await c.count()) > 0) {
      await c.first().click();
      await pagina.waitForTimeout(900);
      return;
    }
  }
  await pagina.getByText(nome, { exact: true }).last().click();
  await pagina.waitForTimeout(900);
}

async function adicionarPelaBusca(ticker) {
  await botao('Buscar ativo').click();
  await pagina.waitForTimeout(600);
  await pagina.getByRole('textbox', { name: 'Ticker ou nome' }).fill(ticker);
  await pagina.waitForTimeout(1500);
  await pagina.getByRole('button', { name: new RegExp('^' + ticker + ',') }).first().click();
  // A confirmação (Alert → window.confirm) adiciona e abre o detalhe do ativo.
  await esperarTexto('Gráfico técnico', 30000);
  // O detalhe é uma tela da pilha (sem barra de abas): voltar leva ao Início.
  await pagina.goBack();
  await pagina.waitForTimeout(1200);
}

(async () => {
  const navegador = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--disable-web-security'],
    headless: true,
  });
  const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR' });
  pagina = await contexto.newPage();
  pagina.setDefaultTimeout(15000);
  pagina.on('dialog', async (d) => {
    dialogos.push(`${d.type()}: ${d.message().replace(/\n+/g, ' / ').slice(0, 160)}`);
    await d.accept();
  });
  pagina.on('console', (m) => {
    if (m.type() === 'error') errosDoConsole.push(m.text().slice(0, 240));
  });
  pagina.on('pageerror', (e) => errosDoConsole.push(`pageerror: ${String(e).slice(0, 240)}`));

  await pagina.goto(URL, { waitUntil: 'load', timeout: 120000 });
  await pagina.waitForTimeout(3000);

  await passo('1 cadastro', async () => {
    await pagina.getByText('Criar conta', { exact: true }).last().click();
    await pagina.getByRole('textbox', { name: 'Nome' }).fill('Prévia Web');
    await pagina.getByRole('textbox', { name: 'E-mail' }).fill(EMAIL);
    await pagina.getByLabel('Senha', { exact: true }).first().fill(SENHA);
    await botao('Criar conta').click();
    await esperarTexto('watchlist está vazia', 30000);
  });

  await passo('2 inicio vazio com buscar', async () => {
    await esperarTexto('Buscar ativo');
  });

  for (const ticker of ['PETR4', 'VALE3', 'BTC']) {
    await passo(`3 adicionar ${ticker} pela busca`, async () => {
      await adicionarPelaBusca(ticker);
    });
  }

  await passo('4 inicio com a watchlist', async () => {
    // volta para o Início se a busca deixou outra tela aberta
    if ((await pagina.getByText('PETR4', { exact: true }).count()) === 0) await abrirAba('Início');
    await esperarTexto('PETR4', 20000);
    await pagina.waitForTimeout(2500);
  });

  await passo('5 detalhe do ativo PETR4', async () => {
    await pagina.getByText('PETR4', { exact: true }).first().click();
    await esperarTexto('Gráfico técnico', 20000);
    await esperarTexto('Indicadores técnicos');
    await pagina.waitForTimeout(2500);
  });

  await passo('6 analise por IA sem IA no servidor', async () => {
    await botao('Gerar análise por IA').scrollIntoViewIfNeeded();
    await botao('Gerar análise por IA').click();
    await esperarTexto('A IA está indisponível no momento', 90000);
    await esperarTexto('Análise gerada por IA. Não constitui recomendação de investimento.');
  });

  await passo('7 voltar e abrir a carteira', async () => {
    await pagina.goBack();
    await pagina.waitForTimeout(800);
    await abrirAba('Carteira');
    await esperarTexto('Operações simuladas', 20000);
  });

  await passo('8 nova operacao de compra', async () => {
    // Carteira vazia mostra "Registrar operação"; com operações, "Nova operação".
    const abrir = (await botao('Registrar operação').count()) > 0 ? botao('Registrar operação') : botao('Nova operação');
    await abrir.click();
    await pagina.waitForTimeout(1500);
    await captura('modal-nova-operacao-aberto');
    await pagina.getByRole('button', { name: 'Usar PETR4' }).click();
    await pagina.getByRole('textbox', { name: 'Quantidade' }).fill('10');
    await pagina.getByRole('textbox', { name: /Preço unitário/ }).fill('30,50');
    await captura('modal-nova-operacao-preenchido');
    await pagina.getByRole('button', { name: 'Registrar operação' }).last().click();
    await pagina.waitForTimeout(3500);
  });

  await passo('9 carteira com a posicao', async () => {
    await abrirAba('Carteira');
    await esperarTexto('Posições', 20000);
    await pagina.waitForTimeout(2000);
  });

  await passo('10 alertas preco', async () => {
    await abrirAba('Alertas');
    await esperarTexto('Novo alerta de preço', 20000);
  });

  await passo('11 chat sem IA', async () => {
    await abrirAba('Chat');
    await esperarTexto('Posso responder sobre a sua carteira simulada', 20000);
    await pagina.getByRole('button', { name: 'A carteira está acima do CDI?' }).click();
    await esperarTexto('A IA está indisponível no momento', 90000);
    await esperarTexto('Tentar novamente');
  });

  await passo('12 perfil', async () => {
    await abrirAba('Perfil');
    await esperarTexto('Notificações push', 20000);
    await esperarTexto('Notificar por ativo');
    await esperarTexto('Servidor');
  });

  await passo('13 testar conexao', async () => {
    await botao('Testar conexão').scrollIntoViewIfNeeded();
    await botao('Testar conexão').click();
    await esperarTexto('Conectado (', 15000);
  });

  await passo('14 tema claro', async () => {
    await pagina.getByRole('radio', { name: 'Claro' }).click();
    await pagina.waitForTimeout(800);
  });

  await passo('15 sair', async () => {
    await botao('Sair').scrollIntoViewIfNeeded();
    await botao('Sair').click();
    await esperarTexto('Acesse sua conta', 20000);
  });

  console.log(resultados.join('\n'));
  console.log('\nDIALOGOS', JSON.stringify(dialogos, null, 1));
  const unicos = [...new Set(errosDoConsole)].slice(0, 12);
  console.log('\nERROS DO CONSOLE', JSON.stringify(unicos, null, 1));
  console.log('\nCONTA', EMAIL);
  await navegador.close();
})().catch((e) => {
  console.error('FALHOU', e.message);
  console.log(resultados.join('\n'));
  process.exit(1);
});
