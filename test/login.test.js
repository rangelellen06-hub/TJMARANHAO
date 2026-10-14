import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { preencherLogin } from '../src/preencher-login.js';

test('rejeita credenciais ausentes antes de acessar a página', async () => {
  await assert.rejects(preencherLogin(null, { usuario: '', senha: '' }), /Configure TJMA_USUARIO/);
});

test('preenche os campos na ordem e substitui valores anteriores', async () => {
  // A opção é exclusiva do teste isolado, que carrega apenas HTML local.
  const browser = await puppeteer.launch({
    headless: true,
    args: process.env.TJMA_TEST_CONTAINER === '1' ? ['--no-sandbox'] : [],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <input id="LoginTextBoxUsuario" value="anterior">
      <input id="LoginTextBoxSenha" type="password" value="anterior">
      <script>
        window.ordem = [];
        document.addEventListener('input', (event) => window.ordem.push(event.target.id));
      </script>
    `);
    await preencherLogin(page, { usuario: 'usuario-teste', senha: 'senha-teste' });
    const resultado = await page.evaluate(() => ({
      usuario: document.querySelector('#LoginTextBoxUsuario').value,
      senha: document.querySelector('#LoginTextBoxSenha').value,
      ordem: [...new Set(window.ordem)],
    }));
    assert.deepEqual(resultado, {
      usuario: 'usuario-teste', senha: 'senha-teste',
      ordem: ['LoginTextBoxUsuario', 'LoginTextBoxSenha'],
    });
  } finally {
    await browser.close();
  }
});
