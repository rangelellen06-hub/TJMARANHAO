export async function coletarDados(page) {
  await page.waitForSelector('#ctl00_ContentPlaceHolder1_ButtonVoltar', { visible: true });
  return page.evaluate(() => {
    const limpar = (texto) => (texto ?? '').replace(/\s+/g, ' ').trim();
    const ler = (rotulo, literal) => {
      const encontrados = [];
      for (const linha of document.querySelectorAll('tr')) {
        const celulas = [...linha.children].filter((el) => el.tagName === 'TD');
        for (let i = 0; i < celulas.length - 1; i++) {
          if (limpar(celulas[i].textContent) === rotulo &&
              (!literal || celulas[i + 1].classList.contains('literal'))) {
            encontrados.push(limpar(celulas[i + 1].textContent));
          }
        }
      }
      if (encontrados.length !== 1 || !encontrados[0]) {
        throw new Error(`Campo ausente, vazio ou ambíguo: ${rotulo}.`);
      }
      return encontrados[0];
    };
    const data = limpar(document.querySelector('#ctl00_ContentPlaceHolder1_LabelDataMargem')?.textContent);
    if (!data) throw new Error('Data de atualização da margem não encontrada.');
    return {
      Nome: ler('Nome', true),
      'Matrícula': ler('Matrícula', true),
      'Data Admissão': ler('Data Adm.', true),
      Setor: ler('Setor', true),
      'Empréstimo': ler('Empréstimos', false),
      'Cartão de Crédito': ler('Cartão de Crédito', false),
      'Cartão de Benefício': ler('Cartão de Benefício', false),
      'Margem atualizada em': data,
    };
  });
}

export async function voltarConsulta(page) {
  const seletor = '#ctl00_ContentPlaceHolder1_ButtonVoltar';
  await page.waitForSelector(seletor, { visible: true });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60_000 }),
    page.click(seletor),
  ]);
  await page.waitForSelector('#ctl00_ContentPlaceHolder1_TextBoxCPF', { visible: true });
}
