// Fica no Início e espera o banner do alerta de BTC (entregue pelo WebSocket, até 7 min).
// Uso: node tools/previa-web/roteiros/banner-do-alerta.js <e-mail> <senha>  (conta com um alerta de BTC criado; capturas em ./capturas)
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

fs.mkdirSync(path.join(process.cwd(), 'capturas'), { recursive: true });

const EMAIL = process.argv[2];
const SENHA = process.argv[3];

(async () => {
  const navegador = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--disable-web-security'], headless: true });
  const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR' });
  const pagina = await contexto.newPage();
  const quadros = [];
  pagina.on('websocket', (ws) => {
    quadros.push(`ws aberto ${ws.url()}`);
    ws.on('framesent', (f) => quadros.push(`enviado ${String(f.payload).replace(/"token":"[^"]+"/, '"token":"…"').slice(0, 90)}`));
    ws.on('framereceived', (f) => quadros.push(`recebido ${String(f.payload).slice(0, 140)}`));
    ws.on('close', () => quadros.push('ws fechado'));
  });
  await pagina.goto(process.env.PREVIA_URL || 'http://localhost:8081', { waitUntil: 'load', timeout: 120000 });
  await pagina.getByRole('textbox', { name: 'E-mail' }).fill(EMAIL);
  await pagina.getByLabel('Senha', { exact: true }).first().fill(SENHA);
  await pagina.getByRole('button', { name: 'Entrar' }).click();
  await pagina.getByText('Watchlist').first().waitFor({ timeout: 30000 });
  console.log('LOGADO, esperando o banner…');
  const banner = pagina.getByText('Alerta de preço · BTC', { exact: true }).first();
  try {
    await banner.waitFor({ state: 'visible', timeout: 7 * 60 * 1000 });
    await pagina.screenshot({ path: path.join(process.cwd(), 'capturas', 'banner-do-alerta.png') });
    console.log('BANNER VISÍVEL');
    await banner.click();
    await pagina.getByText('Gráfico técnico').first().waitFor({ timeout: 20000 });
    console.log('TOQUE ABRIU O ATIVO:', pagina.url());
    await pagina.screenshot({ path: path.join(process.cwd(), 'capturas', 'banner-abriu-o-ativo.png') });
  } catch (e) {
    console.log('SEM BANNER:', String(e.message).split('\n')[0]);
    await pagina.screenshot({ path: path.join(process.cwd(), 'capturas', 'banner-nao-apareceu.png') });
  }
  console.log(quadros.slice(0, 12).join('\n'));
  await navegador.close();
})().catch((e) => {
  console.error('FALHOU', e.message);
  process.exit(1);
});
