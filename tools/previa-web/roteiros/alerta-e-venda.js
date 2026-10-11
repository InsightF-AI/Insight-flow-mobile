// Segundo percurso da prévia web: alerta de BTC com banner em tempo real, venda acima do disponível e remoção.
// Uso: node tools/previa-web/roteiros/alerta-e-venda.js <e-mail> <senha>  (conta que já tem PETR4 comprado; capturas em ./capturas-alerta)
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const EMAIL = process.argv[2];
const SENHA = process.argv[3];
const SAIDA = path.join(process.cwd(), 'capturas-alerta');
fs.mkdirSync(SAIDA, { recursive: true });

const resultados = [];
const dialogos = [];
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
    resultados.push(`OK    ${nome} (${await captura(nome.replace(/[^a-z0-9]+/gi, '-').toLowerCase())})`);
  } catch (erro) {
    let arquivo = '';
    try {
      arquivo = await captura(`FALHA-${nome.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`);
    } catch {}
    resultados.push(`FALHA ${nome} — ${String(erro.message).split('\n')[0].slice(0, 220)} (${arquivo})`);
  }
}

const botao = (nome) => pagina.getByRole('button', { name: nome }).first();
async function esperarTexto(t, ms = 15000) {
  await pagina.getByText(t, { exact: false }).first().waitFor({ state: 'visible', timeout: ms });
}
async function aba(nome) {
  await pagina.getByRole('tab', { name: nome }).first().click();
  await pagina.waitForTimeout(900);
}

(async () => {
  const navegador = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--disable-web-security'], headless: true });
  const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR' });
  pagina = await contexto.newPage();
  pagina.setDefaultTimeout(15000);
  pagina.on('dialog', async (d) => {
    dialogos.push(`${d.type()}: ${d.message().replace(/\n+/g, ' / ').slice(0, 150)}`);
    await d.accept();
  });

  await pagina.goto(process.env.PREVIA_URL || 'http://localhost:8081', { waitUntil: 'load', timeout: 120000 });
  await pagina.getByRole('textbox', { name: 'E-mail' }).fill(EMAIL);
  await pagina.getByLabel('Senha', { exact: true }).first().fill(SENHA);
  await botao('Entrar').click();
  await esperarTexto('Watchlist', 30000);

  await passo('1 criar alerta de BTC', async () => {
    await aba('Alertas');
    await esperarTexto('Novo alerta de preço', 20000);
    await pagina.getByRole('textbox', { name: 'Ticker' }).fill('BTC');
    await pagina.getByRole('textbox', { name: 'Valor alvo' }).fill('300000');
    await botao('Criar alerta').click();
    await esperarTexto('Seus alertas');
    await pagina.getByText('Preço atual', { exact: false }).first().waitFor({ timeout: 20000 });
  });

  await passo('2 venda acima do disponivel', async () => {
    await aba('Carteira');
    await botao('Nova operação').click();
    await esperarTexto('Operação simulada', 20000);
    await pagina.getByRole('radio', { name: 'Venda' }).click();
    await pagina.getByRole('button', { name: 'Usar PETR4' }).click();
    await esperarTexto('Disponível para venda: 10', 20000);
    await pagina.getByRole('textbox', { name: 'Quantidade' }).fill('50');
    await pagina.getByRole('textbox', { name: /Preço unitário/ }).fill('33');
    await botao('Registrar operação').click();
    await pagina.waitForTimeout(800);
  });

  await passo('3 venda valida de 4 unidades', async () => {
    await pagina.getByRole('textbox', { name: 'Quantidade' }).fill('4');
    await botao('Registrar operação').click();
    await esperarTexto('Posições', 30000);
    await esperarTexto('Lucro realizado', 20000);
    await pagina.waitForTimeout(2000);
  });

  await passo('4 caixa de notificacoes', async () => {
    await aba('Início');
    await botao('Notificações').click();
    await pagina.waitForTimeout(1500);
  });

  await passo('5 voltar ao inicio e aguardar o banner do alerta (ate 6 min)', async () => {
    await pagina.goBack();
    await esperarTexto('Watchlist', 15000);
    // O ciclo de cripto do backend roda a cada 5 min: o WebSocket entrega o banner no topo da tela.
    await pagina.getByText('Alerta de preço', { exact: false }).first().waitFor({ state: 'visible', timeout: 6 * 60 * 1000 });
  });

  await passo('6 tocar no banner abre o ativo', async () => {
    await pagina.getByText('Alerta de preço', { exact: false }).first().click();
    await esperarTexto('Gráfico técnico', 20000);
  });

  console.log(resultados.join('\n'));
  console.log('\nDIALOGOS', JSON.stringify(dialogos, null, 1));
  await navegador.close();
})().catch((e) => {
  console.error('FALHOU', e.message);
  console.log(resultados.join('\n'));
  process.exit(1);
});
