import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { chromium } from 'playwright';

const staticFiles = new Map([
  ['/', ['index.html', 'text/html']],
  ['/style.css', ['style.css', 'text/css']],
  ['/app.js', ['app.js', 'text/javascript']],
  ['/andes.webp', ['andes.webp', 'image/webp']],
]);

test('O build online permite cadastrar contas, conversar e limpar apenas o próprio histórico', async (t) => {
  const server = createServer(async (req, res) => {
    const asset = staticFiles.get(req.url);
    if (!asset) {
      res.writeHead(404).end();
      return;
    }
    try {
      const [file, mime] = asset;
      const bytes = await readFile(new URL('../dist/' + file, import.meta.url));
      res.writeHead(200, { 'Content-Type': mime }).end(bytes);
    } catch {
      res.writeHead(500).end();
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const url = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.YALA_CHROMIUM });
  t.after(() => browser.close());

  async function register(name, country) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    await page.goto(url);
    await page.getByLabel('E-mail').fill(name.toLowerCase() + '@example.test');
    await page.getByLabel('Senha').fill('Senha-ficticia-123');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await page.getByLabel('Nome no diretório').fill(name);
    await page.locator('#profile [name=country]').selectOption(country);
    await page.getByLabel('Universidade', { exact: true }).fill('Universidade Exemplo');
    await page.getByLabel('Curso', { exact: true }).fill('Computação');
    await page.getByLabel('Interesses', { exact: true }).fill('Dados abertos');
    await page.getByRole('button', { name: 'Salvar perfil' }).click();
    await page.getByText('Perfil salvo no diretório.').waitFor();
    return page;
  }

  async function openChat(page, peer) {
    await page.getByRole('button', { name: 'Atualizar diretório' }).click();
    await page.getByRole('button', { name: 'Abrir conversa com ' + peer }).click();
  }

  async function send(page, body) {
    await page.getByLabel('Mensagem', { exact: true }).fill(body);
    await page.getByRole('button', { name: 'Enviar mensagem' }).click();
    await page.getByText('Mensagem enviada.').waitFor();
  }

  const ana = await register('Ana', 'Brasil');
  const bia = await register('Bia', 'Chile');
  await openChat(ana, 'Bia');
  await send(ana, 'Vamos estudar juntas?');
  await openChat(bia, 'Ana');
  await bia.getByText('Vamos estudar juntas?', { exact: true }).waitFor();

  await ana.getByRole('button', { name: 'Excluir conversa do meu histórico' }).click();
  await ana.getByRole('button', { name: 'Excluir meu histórico' }).click();
  await ana.getByText('Conversa excluída do seu histórico.').waitFor();
  await ana.getByText('Nenhuma mensagem nesta conversa ainda.').waitFor();
  assert.equal(await ana.locator('#history li').count(), 0);

  await bia.getByRole('button', { name: 'Atualizar conversa' }).click();
  await bia.getByText('Vamos estudar juntas?', { exact: true }).waitFor();
  await send(bia, 'Vamos!');
  await ana.getByRole('button', { name: 'Atualizar conversa' }).click();
  await ana.getByText('Vamos!', { exact: true }).waitFor();
  assert.equal(await ana.locator('#history li').count(), 1);
});
