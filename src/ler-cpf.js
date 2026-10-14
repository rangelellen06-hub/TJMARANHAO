import ExcelJS from 'exceljs';

export function normalizarCpf(valor) {
  // Células numéricas do Excel podem perder zeros à esquerda.
  const texto = typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= 0
    ? String(valor).padStart(11, '0') : String(valor ?? '').trim();
  if (!/^\d{11}$/.test(texto) && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(texto)) {
    throw new Error('CPF deve conter 11 dígitos, com ou sem pontuação.');
  }
  return texto.replace(/\D/g, '');
}

export async function lerPrimeiroCpf(caminho, { aba, coluna = 'CPF' } = {}) {
  if (!caminho) throw new Error('Configure TJMA_PLANILHA com o caminho do arquivo .xlsx.');
  if (!/\.xlsx$/i.test(caminho)) throw new Error('Nesta etapa, use uma planilha .xlsx.');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(caminho);
  const sheet = aba ? workbook.getWorksheet(aba) : workbook.worksheets[0];
  if (!sheet) throw new Error('A aba indicada não foi encontrada na planilha.');
  let indice;
  sheet.getRow(1).eachCell((cell, numero) => {
    if (cell.text.trim().toLocaleUpperCase('pt-BR') === coluna.trim().toLocaleUpperCase('pt-BR')) {
      if (indice !== undefined) throw new Error('A coluna de CPF está duplicada.');
      indice = numero;
    }
  });
  if (!indice) throw new Error('Coluna de CPF não encontrada no cabeçalho da primeira linha.');
  for (let linha = 2; linha <= sheet.rowCount; linha++) {
    const cell = sheet.getRow(linha).getCell(indice);
    if (!cell.text.trim()) continue;
    if (cell.type === ExcelJS.ValueType.Formula) {
      throw new Error(`Use um CPF como valor, sem fórmula, na linha ${linha}.`);
    }
    try {
      return normalizarCpf(typeof cell.value === 'number' ? cell.value : cell.text);
    } catch {
      throw new Error(`CPF com formato inválido na linha ${linha}.`);
    }
  }
  throw new Error('Nenhum CPF preenchido foi encontrado na planilha.');
}
