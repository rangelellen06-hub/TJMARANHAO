import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import { prepararResultados } from '../src/planilha-resultados.js';
import { processarPlanilha } from '../src/processar-planilha.js';
import { coletarDados } from '../src/coletar-dados.js';

test('consulta duas linhas, coleta os oito campos, salva e volta sem alterar a entrada', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'tjma-lote-'));
  let browser;
  let voltas = 0;
  let falharSegunda = false;
  const cpfs = [];
  const filtro = `<form method="post" action="/consulta"><input name="cpf" id="ctl00_ContentPlaceHolder1_TextBoxCPF">
    <input type="submit" id="ctl00_ContentPlaceHolder1_ButtonBuscar" value="Buscar"></form>`;
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (req.url === '/voltar') {
      voltas++;
      res.end(filtro);
    } else if (req.method === 'POST') {
      const partes = [];
      for await (const parte of req) partes.push(parte);
      cpfs.push(new URLSearchParams(Buffer.concat(partes).toString()).get('cpf'));
      const linhas = [
        ['Nome', `Pessoa Teste ${cpfs.length}`], ['Matrícula', '00123'],
        ['Data Adm.', '19/12/2003'], ['Setor', 'SETOR DE TESTE'],
        ['Empréstimos', '302,61'], ['Cartão de Crédito', '1.282,85'],
        ['Cartão de Benefício', '0,00'],
      ];
      if (falharSegunda && cpfs.length === 4) linhas.splice(3, 1);
      res.end(`<table>${linhas.map(([nome, valor]) => `<tr><td><label> ${nome} </label></td><td class="literal"> ${valor} </td></tr>`).join('')}</table>
        <span id="ctl00_ContentPlaceHolder1_LabelDataMargem">08/10/2026</span>
        <form action="/voltar" method="post"><input type="submit" id="ctl00_ContentPlaceHolder1_ButtonVoltar" value="Voltar"></form>`);
    } else res.end(filtro);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const entrada = join(pasta, 'entrada.xlsx');
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Dados').addRows([['CPF', 'Nome'], ['01234567890', 'Original 1'], ['12345678901', 'Original 2']]);
    workbook.addWorksheet('Outra').addRow(['Preservar']);
    await workbook.xlsx.writeFile(entrada);
    const original = await readFile(entrada);
    const planilha = await prepararResultados(entrada, { diretorio: join(pasta, 'saida') });
    browser = await puppeteer.launch({ headless: true,
      args: process.env.TJMA_TEST_CONTAINER === '1' ? ['--no-sandbox'] : [] });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/consulta`);
    await processarPlanilha(page, planilha);
    assert.deepEqual(cpfs, ['012.345.678-90', '123.456.789-01']);
    assert.equal(voltas, 2);
    assert.ok(await page.$('#ctl00_ContentPlaceHolder1_TextBoxCPF'));
    const saida = new ExcelJS.Workbook();
    await saida.xlsx.readFile(planilha.saida);
    const sheet = saida.getWorksheet('Dados');
    assert.deepEqual(sheet.getRow(2).values.slice(1), ['01234567890', 'Original 1',
      'Pessoa Teste 1', '00123', '19/12/2003', 'SETOR DE TESTE', '302,61', '1.282,85', '0,00', '08/10/2026', 'Concluído']);
    assert.equal(sheet.getRow(3).getCell(3).value, 'Pessoa Teste 2');
    assert.equal(sheet.getRow(3).getCell(11).value, 'Concluído');
    assert.equal(saida.getWorksheet('Outra').getCell('A1').value, 'Preservar');
    assert.deepEqual(await readFile(entrada), original);
    falharSegunda = true;
    const parcial = await prepararResultados(entrada, { diretorio: join(pasta, 'saida') });
    assert.notEqual(parcial.saida, planilha.saida);
    await assert.rejects(processarPlanilha(page, parcial), /linha 3.*Setor/);
    const progresso = new ExcelJS.Workbook();
    await progresso.xlsx.readFile(parcial.saida);
    assert.equal(progresso.getWorksheet('Dados').getCell('K2').value, 'Concluído');
    assert.equal(progresso.getWorksheet('Dados').getCell('K3').value, 'Não concluído - conferir página');
    assert.equal(progresso.getWorksheet('Dados').getCell('C3').value, '');
    assert.equal(voltas, 3);
    // A falta de campos não produz uma coleta parcialmente preenchida.
    await page.setContent('<input id="ctl00_ContentPlaceHolder1_ButtonVoltar"><table><tr><td>Nome</td><td class="literal">Teste</td></tr></table><span id="ctl00_ContentPlaceHolder1_LabelDataMargem">08/10/2026</span>');
    await assert.rejects(coletarDados(page), /Matrícula/);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(pasta, { recursive: true, force: true });
  }
});
