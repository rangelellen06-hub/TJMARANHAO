# Automação TJ Maranhão

JavaScript + Node.js + Puppeteer para abrir o portal ConsigSimples e preencher usuário e senha. O código de verificação e o clique em **ACESSAR** são feitos manualmente. Após o login, a automação clica em **Acessar o Sistema** na página de avisos e aguarda a navegação.

## Preparação

Use Node.js 22 ou superior e um ambiente com interface gráfica para visualizar o navegador.

```sh
npm ci
npx puppeteer browsers install chrome
cp .env.example .env
```

Preencha `TJMA_USUARIO` e `TJMA_SENHA` no arquivo `.env` local. Não compartilhe esse arquivo nem coloque credenciais no código. Valores com `#` ou espaços devem ficar entre aspas.

## Executar

Coloque sua planilha `.xlsx` em `dados/` (pasta ignorada pelo Git) e defina `TJMA_PLANILHA` no `.env`. O cabeçalho deve estar na primeira linha, com uma coluna `CPF`. Se necessário, configure `TJMA_COLUNA_CPF` e `TJMA_ABA`; sem aba indicada, será usada a primeira. CPFs podem ser texto com ou sem pontuação. Para preservar zeros à esquerda, prefira células de texto; valores numéricos inteiros são completados até 11 dígitos. Fórmulas não são aceitas na célula selecionada.

A automação processa cada CPF não vazio em sequência: preenche o filtro, clica em **Buscar**, coleta Nome, Matrícula, Data Admissão, Setor, Empréstimo, Cartão de Crédito, Cartão de Benefício e Margem atualizada em; salva a planilha e clica em **Voltar**. Os CPFs são verificados antes de iniciar o navegador quanto ao formato, sem validar os dígitos verificadores, e não são impressos nos logs.

A saída fica em `resultados/consulta-<identificador>/funcionarios-resultados.xlsx`, com o caminho informado no terminal. Cada execução gera uma nova pasta. A planilha original é preservada, e novas colunas com prefixo `TJMA -` são acrescentadas à aba escolhida. Matrículas, datas e valores de margem são gravados como texto, conforme apresentados no portal. O progresso é salvo após cada coleta, antes de clicar em **Voltar**.

Se a busca não abrir a ficha esperada, algum campo estiver ausente ou ambíguo, ou a navegação falhar, o processamento para e mantém o navegador aberto para conferência. A saída distingue linhas concluídas, não concluídas e pendentes. Ainda não há tratamento automático de CPF não encontrado, múltiplos vínculos ou retomada de uma execução interrompida. O formato real da sua planilha e o fluxo do portal precisam ser validados quando disponíveis.

```sh
npm start
```

O navegador abre o portal e preenche os campos. Você tem até cinco minutos para concluir o login manual. Quando o botão **Acessar o Sistema** aparecer, a automação clica nele uma vez e aguarda a navegação. Em seguida, passa o mouse sobre **Cadastros**, espera a opção **Consultar Funcionários** aparecer e clica nela. O link é obtido da página atual, preservando os parâmetros da sessão. O navegador permanece aberto na página de consulta; feche-o para encerrar. Em um servidor sem interface gráfica, será necessário disponibilizar uma sessão gráfica para essa interação.

## Validar

```sh
npm test
```

Os testes usam uma página local com os seletores fornecidos, sem credenciais reais e sem enviar login ao portal.

Se já houver Chromium instalado, defina `PUPPETEER_EXECUTABLE_PATH` com o caminho do executável. Neste ambiente na nuvem, o teste local pode ser executado com:

```sh
XDG_CONFIG_HOME=/tmp/tjma-chromium-config XDG_CACHE_HOME=/tmp/tjma-chromium-cache PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium TJMA_TEST_CONTAINER=1 npm test
```

Essa opção desativa o sandbox somente para o teste de HTML local. A automação do portal mantém o sandbox do navegador.
