import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import { lerPrimeiroCpf, normalizarCpf } from '../src/ler-cpf.js';
import { preencherCpf } from '../src/preencher-cpf.js';

test('normaliza pontuação e zeros de células numéricas; rejeita formatos inválidos', () => {
  assert.equal(normalizarCpf('012.345.678-90'), '01234567890');
  assert.equal(normalizarCpf(1234567890), '01234567890');
  assert.throws(() => normalizarCpf('123'), /11 dígitos/);
  assert.throws(() => normalizarCpf('abc01234567890'), /11 dígitos/);
});

test('lê o primeiro CPF preenchido do XLSX e preenche o campo com eventos e máscara', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'tjma-cpf-'));
  let browser;
  try {
    const arquivo = join(pasta, 'teste.xlsx');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Funcionarios');
    sheet.addRow(['Nome', 'CPF']);
    sheet.addRow(['Sem CPF', '']);
    sheet.addRow(['Fictício', 1234567890]);
    sheet.addRow(['Outro', '99999999999']);
    await workbook.xlsx.writeFile(arquivo);
    const cpf = await lerPrimeiroCpf(arquivo);
    assert.equal(cpf, '01234567890');
    await assert.rejects(lerPrimeiroCpf(arquivo, { coluna: 'Ausente' }), /Coluna/);
    await assert.rejects(lerPrimeiroCpf(arquivo, { aba: 'Ausente' }), /aba/);
    browser = await puppeteer.launch({
      headless: true,
      args: process.env.TJMA_TEST_CONTAINER === '1' ? ['--no-sandbox'] : [],
    });
    const page = await browser.newPage();
    await page.setContent(`<input id="ctl00_ContentPlaceHolder1_TextBoxCPF" value="anterior"
      onblur="this.value=this.value.replace(/\\D/g,'').replace(/^(\\d{3})(\\d{3})(\\d{3})(\\d{2})$/, '$1.$2.$3-$4')">
      <script>window.eventos=[]; for(const tipo of ['input','change','blur']) {
        document.querySelector('input').addEventListener(tipo, () => window.eventos.push(tipo));
      }</script>`);
    await preencherCpf(page, cpf);
    assert.equal(await page.$eval('input', (el) => el.value), '012.345.678-90');
    assert.deepEqual(await page.evaluate(() => window.eventos), ['input', 'change', 'blur']);
  } finally {
    if (browser) await browser.close();
    await rm(pasta, { recursive: true, force: true });
  }
});
