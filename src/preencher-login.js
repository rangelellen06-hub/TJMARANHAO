export async function preencherLogin(page, { usuario, senha }) {
  if (!usuario || !senha) {
    throw new Error('Configure TJMA_USUARIO e TJMA_SENHA no arquivo .env.');
  }

  for (const [seletor, valor] of [
    ['#LoginTextBoxUsuario', usuario],
    ['#LoginTextBoxSenha', senha],
  ]) {
    await page.waitForSelector(seletor, { visible: true });
    await page.$eval(seletor, (campo) => { campo.value = ''; });
    await page.type(seletor, valor);
  }
}
