export async function buscarFuncionario(page) {
  const seletor = '#ctl00_ContentPlaceHolder1_ButtonBuscar';
  await page.waitForSelector(seletor, { visible: true });
  // Registra a espera antes do clique, inclusive para postback na mesma URL.
  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60_000 }),
      page.click(seletor),
    ]);
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error('A busca não concluiu o postback em até 60 segundos. Confira a validação do CPF e o estado da página.', { cause: error });
    }
    throw error;
  }
}
