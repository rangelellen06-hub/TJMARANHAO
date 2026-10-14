import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import puppeteer from 'puppeteer';
import { acessarSistema } from '../src/acessar-sistema.js';

test('aguarda o botão de avisos e envia o formulário uma única vez', async () => {
  let acessos = 0;
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (req.url === '/sistema' && req.method === 'POST') {
      acessos++;
      res.end('<h1>Sistema de teste</h1>');
    } else {
      res.end(`<form method="post" action="/sistema">
        <input type="submit" name="ctl00$ContentPlaceHolder1$LinkButtonAcessarPaginaPadrao"
          value="Acessar o Sistema" id="ctl00_ContentPlaceHolder1_LinkButtonAcessarPaginaPadrao"
          style="display:none">
        </form><script>setTimeout(() => document.querySelector('input').style.display = 'block', 100);</script>`);
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: process.env.TJMA_TEST_CONTAINER === '1' ? ['--no-sandbox'] : [],
    });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/avisos`);
    await acessarSistema(page, { timeout: 5_000 });
    assert.equal(new URL(page.url()).pathname, '/sistema');
    assert.equal(await page.$eval('h1', (element) => element.textContent), 'Sistema de teste');
    assert.equal(acessos, 1);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
