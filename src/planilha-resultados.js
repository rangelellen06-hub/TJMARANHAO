import ExcelJS from 'exceljs';
import { mkdir, mkdtemp, rename, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { normalizarCpf } from './ler-cpf.js';

export const campos = ['Nome', 'Matrícula', 'Data Admissão', 'Setor', 'Empréstimo',
  'Cartão de Crédito', 'Cartão de Benefício', 'Margem atualizada em'];

export async function prepararResultados(caminho, { aba, coluna = 'CPF', diretorio = './resultados' } = {}) {
  if (!caminho || !/\.xlsx$/i.test(caminho)) throw new Error('Configure TJMA_PLANILHA com um arquivo .xlsx.');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(caminho);
  const sheet = aba ? workbook.getWorksheet(aba) : workbook.worksheets[0];
  if (!sheet) throw new Error('A aba indicada não foi encontrada.');
  const indices = [];
  sheet.getRow(1).eachCell((cell, numero) => {
    if (cell.text.trim().toLocaleUpperCase('pt-BR') === coluna.trim().toLocaleUpperCase('pt-BR')) indices.push(numero);
  });
  if (indices.length !== 1) throw new Error('O cabeçalho deve conter uma única coluna de CPF.');
  const registros = [];
  for (let linha = 2; linha <= sheet.rowCount; linha++) {
    const cell = sheet.getRow(linha).getCell(indices[0]);
    if (!cell.text.trim()) continue;
    try {
      if (cell.type === ExcelJS.ValueType.Formula) throw new Error('Fórmula');
      registros.push({ linha, cpf: normalizarCpf(typeof cell.value === 'number' ? cell.value : cell.text) });
    } catch {
      throw new Error(`CPF inválido ou com fórmula na linha ${linha}. Corrija antes de executar.`);
    }
  }
  if (!registros.length) throw new Error('Nenhum CPF preenchido foi encontrado.');
  // Acrescenta colunas, preservando todos os dados de entrada, mesmo com nomes iguais.
  const inicio = sheet.columnCount + 1;
  const titulos = [...campos.map((nome) => `TJMA - ${nome}`), 'TJMA - Status'];
  titulos.forEach((nome, i) => { sheet.getRow(1).getCell(inicio + i).value = nome; });
  await mkdir(resolve(diretorio), { recursive: true });
  const pasta = await mkdtemp(join(resolve(diretorio), 'consulta-'));
  const saida = join(pasta, 'funcionarios-resultados.xlsx');
  const salvar = async () => {
    const temporario = join(pasta, 'resultados.tmp');
    await writeFile(temporario, await workbook.xlsx.writeBuffer());
    await rename(temporario, saida);
  };
  const registrar = (linha, dados, status) => {
    campos.forEach((nome, i) => {
      // Strings preservam matrícula, datas e valores monetários como apresentados.
      sheet.getRow(linha).getCell(inicio + i).value = dados?.[nome] ?? '';
    });
    sheet.getRow(linha).getCell(inicio + campos.length).value = status;
  };
  for (const { linha } of registros) registrar(linha, null, 'Pendente');
  await salvar();
  return { registros, saida, registrar, salvar };
}
