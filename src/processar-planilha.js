import { preencherCpf } from './preencher-cpf.js';
import { buscarFuncionario } from './buscar-funcionario.js';
import { coletarDados, voltarConsulta } from './coletar-dados.js';

export async function processarPlanilha(page, planilha) {
  for (const [indice, registro] of planilha.registros.entries()) {
    let salvo = false;
    try {
      await preencherCpf(page, registro.cpf);
      await buscarFuncionario(page);
      const dados = await coletarDados(page);
      planilha.registrar(registro.linha, dados, 'Concluído');
      await planilha.salvar();
      salvo = true;
      console.log(`Consulta ${indice + 1}/${planilha.registros.length} salva (linha ${registro.linha}).`);
      await voltarConsulta(page);
    } catch (error) {
      if (!salvo) {
        planilha.registrar(registro.linha, null, 'Não concluído - conferir página');
        await planilha.salvar();
      }
      throw new Error(`Processamento interrompido na linha ${registro.linha}${salvo ? ' após salvar os dados' : ''}. ${error.message}`, { cause: error });
    }
  }
}
