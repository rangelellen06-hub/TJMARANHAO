export async function abrirConsultaFuncionarios(page) {
  const menu = 'a[title="Cadastros"]';
  const consulta = 'a[title="Consultar Funcionários"]';

  await page.waitForSelector(menu, { visible: true });
  await page.hover(menu);
  await page.waitForSelector(consulta, { visible: true });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60_000 }),
    page.click(consulta),
  ]);
  if (!new URL(page.url()).pathname.endsWith('/ConsultarFuncionario.aspx')) {
    throw new Error('A navegação não chegou à página Consultar Funcionários.');
  }
}
