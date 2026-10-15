// Percurso da prévia web com a IA LIGADA (Gemini falso de tools/ia-falsa no backend local): análise sob demanda e chat.
// Uso (na raiz do projeto): node tools/previa-web/roteiros/ia-ligada.js   (capturas em ./capturas-ia)
// Cenários do Gemini falso pelo texto da pergunta: "#cota" (429 → 503 com Retry-After 37) e "#guardrail" (→ 502).
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const SAIDA = path.join(process.cwd(), 'capturas-ia');
fs.mkdirSync(SAIDA, { recursive: true });
const URL = process.env.PREVIA_URL || 'http://localhost:8081';
const sufixo = `${Date.now()}`.slice(-8);
const EMAIL = `previa-ia-${sufixo}@example.com`;
const SENHA = `PreviaIA-${sufixo}-Tura!9`;

const resultados = [];
const dialogos = [];
const errosDoConsole = [];
let contador = 0;
let pagina;
let contexto;

async function captura(nome) {
  contador += 1;
  const arquivo = `${String(contador).padStart(2, '0')}-${nome}.png`;
  await pagina.screenshot({ path: path.join(SAIDA, arquivo), fullPage: true });
  return arquivo;
}

const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '');

async function passo(nome, fn) {
  try {
    await fn();
    resultados.push(`OK    ${nome} (${await captura(slug(nome))})`);
  } catch (erro) {
    let arquivo = '';
    try {
      arquivo = await captura(`FALHA-${slug(nome)}`);
    } catch {}
    resultados.push(`FALHA ${nome} — ${String(erro.message).split('\n')[0].slice(0, 240)} (${arquivo})`);
  }
}

const botao = (nome, opcoes = {}) => pagina.getByRole('button', { name: nome, ...opcoes }).first();
async function esperarTexto(t, ms = 15000) {
  await pagina.getByText(t, { exact: false }).first().waitFor({ state: 'visible', timeout: ms });
}
async function abrirAba(nome) {
  await pagina.getByRole('tab', { name: nome }).first().click();
  await pagina.waitForTimeout(900);
}
async function adicionarPelaBusca(ticker) {
  await botao('Buscar ativo').click();
  await pagina.waitForTimeout(600);
  await pagina.getByRole('textbox', { name: 'Ticker ou nome' }).fill(ticker);
  await pagina.waitForTimeout(1500);
  await pagina.getByRole('button', { name: new RegExp('^' + ticker + ',') }).first().click();
  await esperarTexto('Gráfico técnico', 30000);
  await pagina.goBack();
  await pagina.waitForTimeout(1200);
}
const campoDoChat = () => pagina.getByRole('textbox', { name: 'Mensagem para a IA' });
async function perguntar(texto) {
  await campoDoChat().fill(texto);
  await botao('Enviar').click();
}

(async () => {
  const navegador = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--disable-web-security'],
    headless: true,
  });
  contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR' });
  await contexto.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: URL });
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

  await pagina.goto(URL, { waitUntil: 'load', timeout: 240000 });
  await pagina.waitForTimeout(3000);

  await passo('1 cadastro', async () => {
    await pagina.getByText('Criar conta', { exact: true }).last().click();
    await pagina.getByRole('textbox', { name: 'Nome' }).fill('Prévia IA');
    await pagina.getByRole('textbox', { name: 'E-mail' }).fill(EMAIL);
    await pagina.getByLabel('Senha', { exact: true }).first().fill(SENHA);
    await botao('Criar conta').click();
    await esperarTexto('watchlist está vazia', 30000);
  });

  for (const ticker of ['VALE3', 'PETR4']) {
    await passo(`2 adicionar ${ticker}`, async () => {
      await adicionarPelaBusca(ticker);
    });
  }

  await passo('3 compra de 10 PETR4 e 5 VALE3', async () => {
    await abrirAba('Carteira');
    await esperarTexto('Operações simuladas', 20000);
    for (const [ticker, qtd, preco] of [['PETR4', '10', '30,50'], ['VALE3', '5', '60,00']]) {
      const abrir = (await botao('Registrar operação').count()) > 0 ? botao('Registrar operação') : botao('Nova operação');
      await abrir.click();
      await pagina.getByRole('textbox', { name: 'Quantidade' }).waitFor({ state: 'visible', timeout: 20000 });
      await pagina.getByRole('button', { name: `Usar ${ticker}` }).click();
      await pagina.getByRole('textbox', { name: 'Quantidade' }).fill(qtd);
      await pagina.getByRole('textbox', { name: /Preço unitário/ }).fill(preco);
      await pagina.getByRole('button', { name: 'Registrar operação' }).last().click();
      await pagina.waitForTimeout(3000);
      await abrirAba('Carteira');
    }
    await esperarTexto('Posições', 20000);
  });

  await passo('4 analise por IA do VALE3: gera, mostra procedencia, modelo e aviso legal', async () => {
    await abrirAba('Início');
    await pagina.getByText('VALE3', { exact: true }).first().click();
    await esperarTexto('Gráfico técnico', 20000);
    await botao('Gerar análise por IA').scrollIntoViewIfNeeded();
    await botao('Gerar análise por IA').click();
    await esperarTexto('Resposta de teste do Gemini falso', 90000);
    await esperarTexto('Gerada em');
    await esperarTexto('Modelo: gemini-3.5-flash');
    await esperarTexto('Análise gerada por IA. Não constitui recomendação de investimento.');
    if ((await botao('Atualizar análise').count()) === 0) throw new Error('faltou o botão Atualizar análise');
  });

  await passo('5 atualizar analise: reaproveitada do cache', async () => {
    await botao('Atualizar análise').scrollIntoViewIfNeeded();
    await botao('Atualizar análise').click();
    await esperarTexto('Reaproveitada de', 90000);
    await esperarTexto('os dados do ativo não mudaram');
  });

  await passo('6 chat: sugestao responde e traz o aviso legal', async () => {
    await pagina.goBack();
    await pagina.waitForTimeout(800);
    await abrirAba('Chat');
    await esperarTexto('Posso responder sobre a sua carteira simulada', 20000);
    await botao('Qual foi meu ativo mais rentável?').click();
    await esperarTexto('Consultando os dados da carteira', 10000);
    await esperarTexto('Resposta de teste do Gemini falso', 90000);
    await botao('Copiar resposta').waitFor({ state: 'visible' });
  });

  await passo('7 copiar resposta: vai para a area de transferencia com o aviso legal', async () => {
    await botao('Copiar resposta').click();
    await botao('Resposta copiada').waitFor({ state: 'visible', timeout: 5000 });
    const copiado = await pagina.evaluate(() => navigator.clipboard.readText());
    resultados.push(`      area de transferencia: ${JSON.stringify(copiado.slice(0, 200))}`);
    if (!copiado.includes('Resposta de teste do Gemini falso')) throw new Error('texto da resposta fora da área de transferência');
    if (!copiado.includes('Não constitui recomendação')) throw new Error('aviso legal fora do texto copiado');
  });

  await passo('8 pergunta digitada com historico', async () => {
    await perguntar('E como está o setor?');
    await pagina.waitForFunction(
      () => document.body.innerText.split('Resposta de teste do Gemini falso').length - 1 >= 2,
      null,
      { timeout: 90000 },
    );
  });

  await passo('9 pergunta acima de 2000 caracteres: aviso e envio bloqueado', async () => {
    await campoDoChat().fill('x'.repeat(2001));
    await esperarTexto('A pergunta tem 2001 caracteres; o limite é 2000.');
    const desabilitado = await botao('Enviar').isDisabled();
    if (!desabilitado) throw new Error('Enviar deveria estar desabilitado');
    await campoDoChat().fill('');
  });

  await passo('10 cota do provedor: mensagem com a espera e Tentar novamente', async () => {
    await perguntar('#cota');
    await esperarTexto('O limite de uso da IA foi atingido. Tente novamente em 37 s.', 60000);
    await esperarTexto('Não enviada');
    await botao('Tentar novamente').waitFor({ state: 'visible' });
  });

  await passo('11 guardrail: mensagem propria, pergunta anterior fica como nao enviada', async () => {
    await botao('Tentar novamente').click(); // reenvia #cota: a mesma falha
    await esperarTexto('O limite de uso da IA foi atingido', 60000);
    await perguntar('#guardrail');
    await esperarTexto('A IA não conseguiu gerar um texto dentro das regras de linguagem. Tente novamente.', 60000);
  });

  await passo('12 conversa segue depois das falhas', async () => {
    await perguntar('Quais sinais estão ativos agora?');
    await pagina.waitForFunction(
      () => document.body.innerText.split('Resposta de teste do Gemini falso').length - 1 >= 3,
      null,
      { timeout: 90000 },
    );
  });

  await passo('13 limpar conversa volta as sugestoes', async () => {
    await botao('Limpar conversa').click();
    await esperarTexto('Qual foi meu ativo mais rentável?', 10000);
    const sobrou = await pagina.getByText('Resposta de teste do Gemini falso').count();
    if (sobrou !== 0) throw new Error(`ainda há ${sobrou} resposta(s) na tela`);
  });

  await passo('14 sair apaga a conversa (nova pergunta, sair, entrar de novo)', async () => {
    await botao('Qual foi meu ativo mais rentável?').click();
    await esperarTexto('Resposta de teste do Gemini falso', 90000);
    await abrirAba('Perfil');
    await esperarTexto('Notificações push', 20000);
    await botao('Sair').scrollIntoViewIfNeeded();
    await botao('Sair').click();
    await esperarTexto('Acesse sua conta', 20000);
    await pagina.getByRole('textbox', { name: 'E-mail' }).fill(EMAIL);
    await pagina.getByLabel('Senha', { exact: true }).first().fill(SENHA);
    await botao('Entrar').click();
    await esperarTexto('Watchlist', 30000);
    await abrirAba('Chat');
    await esperarTexto('Posso responder sobre a sua carteira simulada', 20000);
    const sobrou = await pagina.getByText('Resposta de teste do Gemini falso').count();
    if (sobrou !== 0) throw new Error(`a conversa não foi limpa: ${sobrou} resposta(s)`);
  });

  console.log(resultados.join('\n'));
  console.log('\nDIALOGOS', JSON.stringify(dialogos, null, 1));
  console.log('\nERROS DO CONSOLE', JSON.stringify([...new Set(errosDoConsole)].slice(0, 12), null, 1));
  console.log('\nCONTA', EMAIL);
  await navegador.close();
})().catch((e) => {
  console.error('FALHOU', e.message);
  console.log(resultados.join('\n'));
  process.exit(1);
});
