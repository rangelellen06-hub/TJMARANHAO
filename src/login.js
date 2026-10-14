import puppeteer from 'puppeteer';
import { preencherLogin } from './preencher-login.js';
import { acessarSistema } from './acessar-sistema.js';
import { abrirConsultaFuncionarios } from './abrir-consulta-funcionarios.js';
import { prepararResultados } from './planilha-resultados.js';
import { processarPlanilha } from './processar-planilha.js';

const usuario = process.env.TJMA_USUARIO;
const senha = process.env.TJMA_SENHA;
let browser;

try {
  if (!usuario || !senha) {
    throw new Error('Configure TJMA_USUARIO e TJMA_SENHA no arquivo .env.');
  }
  const planilha = await prepararResultados(process.env.TJMA_PLANILHA, {
    aba: process.env.TJMA_ABA || undefined,
    coluna: process.env.TJMA_COLUNA_CPF || 'CPF',
  });
  console.log(`Planilha de saída: ${planilha.saida}`);
  browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();
  page.setDefaultTimeout(30_000);
  await page.goto('https://www.consigsimples.com.br/consigtjma/Login.aspx', {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await preencherLogin(page, { usuario, senha });
  console.log('Usuário e senha preenchidos. Digite o código de verificação e clique em ACESSAR no navegador.');
  console.log('Aguardando a página de avisos por até cinco minutos.');
  await acessarSistema(page);
  console.log('Botão Acessar o Sistema acionado e navegação concluída.');
  await abrirConsultaFuncionarios(page);
  console.log('Página Consultar Funcionários aberta.');
  await processarPlanilha(page, planilha);
  console.log(`Consultas concluídas. Planilha salva em: ${planilha.saida}`);
  console.log('Feche o navegador para encerrar a automação.');
  await new Promise((resolve) => {
    browser.once('disconnected', resolve);
    if (!browser.connected) resolve();
  });
} catch (error) {
  console.error(`Não foi possível concluir a etapa de acesso: ${error.message}`);
  if (browser?.connected) {
    console.log('Confira a página no navegador. Feche-o para encerrar.');
    await new Promise((resolve) => {
      browser.once('disconnected', resolve);
      if (!browser.connected) resolve();
    });
  }
  process.exitCode = 1;
}
