import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import puppeteer from 'puppeteer';
import { abrirConsultaFuncionarios } from '../src/abrir-consulta-funcionarios.js';

test('abre o submenu por hover e segue o link da sessão atual', async () => {
  const destino = '/consigtjma/Paginas/Consignante/ConsultarFuncionario.aspx?data=sessao-local';
  let consultas = 0;
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (req.url === destino) {
      consultas++;
      res.end('<h1>Consultar Funcionários</h1>');
    } else {
      res.end(`<style>
        .submenu { display: none; }
        .menu:hover .submenu { display: block; }
      </style>
      <div class="menu">
        <a href="#" title="Cadastros" class="mFOpenRight">Cadastros</a>
        <div class="submenu"><a href="${destino}" title="Consultar Funcionários">Consultar Funcionários</a></div>
      </div>`);
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
    await page.goto(`http://127.0.0.1:${server.address().port}/Default.aspx`);
    assert.equal(await page.$eval('.submenu', (el) => getComputedStyle(el).display), 'none');
    await abrirConsultaFuncionarios(page);
    const url = new URL(page.url());
    assert.equal(url.pathname + url.search, destino);
    assert.equal(await page.$eval('h1', (el) => el.textContent), 'Consultar Funcionários');
    assert.equal(consultas, 1);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
