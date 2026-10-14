import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import puppeteer from 'puppeteer';
import { preencherCpf } from '../src/preencher-cpf.js';
import { buscarFuncionario } from '../src/buscar-funcionario.js';

test('envia o CPF por um único clique e aguarda postback na mesma URL', async () => {
  let buscas = 0;
  let formulario;
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (req.method === 'POST') {
      buscas++;
      const partes = [];
      for await (const parte of req) partes.push(parte);
      formulario = new URLSearchParams(Buffer.concat(partes).toString());
      res.end('<h1>Resultado da busca de teste</h1>');
    } else {
      res.end(`<form method="post">
        <input id="ctl00_ContentPlaceHolder1_TextBoxCPF" name="ctl00$ContentPlaceHolder1$TextBoxCPF">
        <input type="submit" name="ctl00$ContentPlaceHolder1$ButtonBuscar" value=" Buscar "
          id="ctl00_ContentPlaceHolder1_ButtonBuscar">
      </form>`);
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
    const url = `http://127.0.0.1:${server.address().port}/ConsultarFuncionario.aspx`;
    await page.goto(url);
    await preencherCpf(page, '01234567890');
    await buscarFuncionario(page);
    assert.equal(page.url(), url);
    assert.equal(buscas, 1);
    assert.equal(formulario.get('ctl00$ContentPlaceHolder1$TextBoxCPF'), '012.345.678-90');
    assert.equal(formulario.get('ctl00$ContentPlaceHolder1$ButtonBuscar'), ' Buscar ');
    assert.equal(await page.$eval('h1', (el) => el.textContent), 'Resultado da busca de teste');
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
