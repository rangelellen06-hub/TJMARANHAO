export async function acessarSistema(page, { timeout = 300_000 } = {}) {
  const seletor = '#ctl00_ContentPlaceHolder1_LinkButtonAcessarPaginaPadrao';
  // Permite até cinco minutos para concluir o login manual.
  await page.waitForSelector(seletor, { visible: true, timeout });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60_000 }),
    page.click(seletor),
  ]);
}
