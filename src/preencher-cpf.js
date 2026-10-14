import { normalizarCpf } from './ler-cpf.js';

export async function preencherCpf(page, cpf) {
  const digitos = normalizarCpf(cpf);
  const formatado = digitos.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  const seletor = '#ctl00_ContentPlaceHolder1_TextBoxCPF';
  await page.waitForSelector(seletor, { visible: true });
  // Insere o valor completo para não conflitar com a máscara de onkeydown.
  await page.$eval(seletor, (campo, valor) => {
    campo.focus();
    campo.value = valor;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    campo.dispatchEvent(new Event('change', { bubbles: true }));
    campo.blur();
  }, formatado);
  const valor = await page.$eval(seletor, (campo) => campo.value);
  if (valor.replace(/\D/g, '') !== digitos) {
    throw new Error('O campo CPF não manteve o valor esperado após o preenchimento.');
  }
}
