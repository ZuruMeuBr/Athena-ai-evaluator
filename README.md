# Athena AI Evaluator

[![CI](https://github.com/ZuruMeuBr/Athena-ai-evaluator/actions/workflows/ci.yml/badge.svg)](https://github.com/ZuruMeuBr/Athena-ai-evaluator/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

Framework de Quality Engineering para IA Conversacional. O Athena executa cenarios de NLP, valida respostas por regex, intent e entity, compara execucoes e produz evidencias JSON/HTML prontas para analise e automacao de qualidade.

## O problema que o Athena resolve

Validar uma IA conversacional exige mais do que conferir se uma resposta foi gerada. Times de QA precisam de criterios reproduziveis, rastreabilidade, segmentacao por risco e uma forma objetiva de detectar regressoes entre execucoes. O Athena organiza esse fluxo em um runner local e automatizavel, com massa versionada, providers intercambiaveis, Quality Gates e relatorios historicos.

## Principais funcionalidades

- validacao combinada de Regex, Intent e Entity;
- `MockProvider` deterministico para desenvolvimento e CI;
- `GeminiProvider` com timeout, retry e tratamento de erros;
- importacao de cenarios CSV/XLSX com suporte a UTF-8 e BOM;
- schema validation, IDs unicos e metadados profissionais de QA;
- filtros por categoria, prioridade, severidade, tipo, tag, feature, requisito, autor e versao;
- historico e comparacao entre execucoes, incluindo protecao contra falsos cenarios removidos quando os filtros mudam;
- Quality Gates configuraveis para uso em pipelines;
- dashboard HTML e relatorio JSON com diagnosticos por cenario;
- suite automatizada com Jest e pipeline de CI no GitHub Actions.

## Arquitetura resumida

```text
prompts.json / CSV / XLSX
            |
            v
Schema + metadata filters
            |
            v
Provider (Mock ou Gemini)
            |
            v
Regex + Intent + Entity validators
            |
            v
Score + Quality Gate + Comparison
            |
            v
JSON report + HTML dashboard + History
```

Responsabilidades principais:

- `src/`: orquestracao, configuracao, importacao, filtros, comparacao, relatorios e Quality Gates;
- `providers/`: contrato de provider e implementacoes Mock/Gemini;
- `validators/`: validadores Regex, Intent e Entity;
- `scenarios/` e `prompts.json`: massa de cenarios versionada;
- `tests/`: testes unitarios e de integracao local;
- `scripts/`: comandos auxiliares usados pelos scripts npm;
- `reports/`: artefatos locais gerados e ignorados pelo Git.

## Inicio rapido

Requisitos: Git, Node.js 20 ou superior e npm.

```bash
git clone https://github.com/ZuruMeuBr/Athena-ai-evaluator.git
cd Athena-ai-evaluator
npm install
```

No Windows, crie a configuracao local e use inicialmente o provider Mock:

```powershell
Copy-Item .env.example .env
```

```env
PROVIDER=mock
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT_MS=30000
STRICT_MOCK_RESPONSE_VALIDATION=false
```

Valide e execute:

```bash
npm run build
npm test
npm run validate
npm run evaluate
```

Abra `reports/latest/report.html` no navegador para consultar o dashboard da ultima execucao.

## Conceitos

Uma `intent` representa a intencao do usuario. Exemplo: em `quero atendimento humano`, a intent esperada pode ser `AtendimentoHumano`.

Uma `entity` representa uma informacao especifica extraida ou preservada no contexto. Exemplo: em `quero comprar um carro pcd`, a entity esperada pode ser `PCD`.

O campo `expected` continua sendo uma expressao regular aplicada sobre a resposta gerada pelo provider.

## Estrutura de cenarios

As categorias principais do framework sao:

- `Ofertas`
- `ListaInteresse`
- `Fotos`
- `AtendimentoHumano`
- `Compra`
- `Agendamento`
- `Consulta`

O diretorio `scenarios/` organiza essas categorias para manutencao e crescimento da suite. O arquivo executado pelo framework continua sendo `prompts.json`, preservando compatibilidade com o fluxo existente.

Use `prompts-template.json` como modelo para novos cenarios:

```json
{
  "id": "compra-001",
  "title": "Compra de veiculo PCD",
  "description": "Validar se a IA inicia corretamente a jornada de compra.",
  "categoria": "Compra",
  "priority": "Critical",
  "severity": "Major",
  "type": "Regression",
  "tags": ["PCD", "Compra", "Regression"],
  "feature": "Jornada de Compra",
  "requirementId": "REQ-001",
  "author": "Caio Santos",
  "version": "1.0",
  "prompt": "quero comprar um carro pcd",
  "response": "Posso iniciar sua jornada de Compra para carro PCD.",
  "expected": "(comprar|compra|jornada)",
  "intent": "Compra",
  "entity": "PCD"
}
```

### Metadados opcionais de Quality Engineering

Os cenarios podem receber metadados profissionais sem quebrar compatibilidade com arquivos antigos. Todos os campos abaixo sao opcionais:

- `title`: nome legivel do cenario, exibido no dashboard no lugar do `id` quando existir.
- `description`: objetivo do cenario.
- `priority`: `Critical`, `High`, `Medium` ou `Low`.
- `severity`: `Blocker`, `Major`, `Minor` ou `Trivial`.
- `type`: `Smoke`, `Regression`, `Functional` ou `Exploratory`.
- `tags`: lista de marcadores para segmentacao, como `["PCD", "Compra"]`.
- `feature`: funcionalidade ou jornada validada.
- `requirementId`: requisito, historia ou controle associado.
- `author`: responsavel pelo cenario.
- `version`: versao do cenario.

## Como adicionar novos cenarios

1. Escolha uma categoria existente.
2. Crie um `id` unico e descritivo.
3. Adicione o `prompt` real do usuario.
4. Adicione a `response` que sera validada no modo mock.
5. Defina `expected` como regex para validar a resposta.
6. Defina `intent` e `entity` esperadas na resposta.
7. Inclua o objeto no array de `prompts.json`.

Os campos `id`, `categoria`, `prompt`, `expected`, `intent` e `entity` sao obrigatorios na validacao de schema.

## Validacao de schema dos cenarios

Antes de executar ou importar cenarios, o Athena valida a estrutura dos dados para evitar avaliacoes com massa inconsistente.

Campos obrigatorios:

- `id`
- `categoria`
- `prompt`
- `expected`
- `intent`
- `entity`

Campos opcionais validados quando presentes:

- `response`: string usada pelo `MockProvider`.
- `title`, `description`, `feature`, `requirementId`, `author`, `version`: string.
- `priority`: `Critical`, `High`, `Medium` ou `Low`.
- `severity`: `Blocker`, `Major`, `Minor` ou `Trivial`.
- `type`: `Smoke`, `Regression`, `Functional` ou `Exploratory`.
- `tags`: array de strings ou texto separado por virgula/ponto e virgula. O schema normaliza para array.

IDs duplicados sao bloqueados com mensagem clara. Exemplo:

```text
[compra-001] id: Duplicate id "compra-001" also found at scenario index 0.
```

Para validar a massa sem executar providers:

```bash
npm run validate:scenarios
```

Saida esperada em caso positivo:

```text
Scenario schema validation passed. Total scenarios: 50
```

Em caso de erro, o comando exibe o campo, o cenario e o valor recebido, e encerra com exit code `1`.

No modo `mock`, o campo `response` continua opcional por padrao para preservar o comportamento atual: quando ausente, a execucao registra `ERROR / MISSING_RESPONSE`. Para bloquear cenarios sem `response` antes da execucao, configure:

```env
STRICT_MOCK_RESPONSE_VALIDATION=true
```

## Importacao via XLSX ou CSV

Para suites grandes, mantenha os cenarios em Excel ou CSV e gere o `prompts.json` automaticamente.

Colunas obrigatorias:

- `id`
- `categoria`
- `prompt`
- `expected`
- `intent`
- `entity`

Coluna opcional:

- `response`: usada pelo modo `mock`. No modo `gemini`, a resposta vem da API e esse campo e ignorado.
- `title`, `description`, `priority`, `severity`, `type`, `tags`, `feature`, `requirementId`, `author`, `version`: metadados opcionais de Quality Engineering. Em CSV/XLSX, `tags` pode usar virgula ou ponto e virgula, por exemplo `PCD;Compra;Regression`.

Importar XLSX:

```bash
npm run import -- arquivo.xlsx
```

Importar CSV:

```bash
npm run import -- arquivo.csv
```

O importador valida:

- `id` obrigatorio;
- `categoria` obrigatoria;
- `prompt` obrigatorio;
- `expected` obrigatorio;
- `intent` obrigatorio;
- `entity` obrigatorio;
- IDs duplicados;
- valores permitidos de `priority`, `severity` e `type`;
- formato de `tags`;
- linhas vazias, que sao ignoradas.

Se houver erro critico de schema, o importador mostra os erros, nao escreve `prompts.json`, nao atualiza `scenarios/` e encerra com exit code `1`.

Ao final, ele gera:

- `prompts.json`
- arquivos por categoria em `scenarios/`, como `ofertas.json`, `compra.json`, `agendamento.json` e `consulta.json`

Resumo exibido no terminal:

```text
Total de linhas: 120
Importados: 118
Ignorados: 2
Erros encontrados: 0
```

## Providers

O framework possui dois modos de execucao:

- `mock`: usa o campo `response` do `prompts.json`. Este e o modo padrao e mantem compatibilidade com o comportamento existente.
- `gemini`: ignora o campo `response`, envia o `prompt` para a API Gemini e valida a resposta retornada pelo modelo.

A arquitetura segue o fluxo:

```text
Prompt -> Provider -> Response -> Regex Validator -> Intent Validator -> Entity Validator -> Report
```

Os providers ficam em `providers/`:

- `LLMProvider.ts`: contrato comum com `generateResponse(prompt: string): Promise<string>`.
- `MockProvider.ts`: provider local baseado no JSON.
- `GeminiProvider.ts`: provider integrado com `@google/generative-ai`.

O `GeminiProvider` foi preparado para uso de producao com:

- modelo configuravel por `GEMINI_MODEL`;
- timeout configuravel por `GEMINI_TIMEOUT_MS`;
- ate 3 tentativas automaticas;
- backoff exponencial;
- tratamento de API key invalida, timeout, rate limit e falhas de conexao;
- metricas por cenario.

## Configuracao

Crie ou edite o arquivo `.env` na raiz do projeto. O arquivo `.env.example` serve como modelo.

Modo mock:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT_MS=30000
PROVIDER=mock
STRICT_MOCK_RESPONSE_VALIDATION=false
```

Modo Gemini:

```env
GEMINI_API_KEY=sua-chave-aqui
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT_MS=30000
PROVIDER=gemini
STRICT_MOCK_RESPONSE_VALIDATION=false
```

Quando `PROVIDER=gemini`, a variavel `GEMINI_API_KEY` e obrigatoria. Se a chamada ao provider falhar, o cenario e marcado como `ERROR` e o erro e registrado no resultado.

## API Key do Gemini

Crie ou visualize sua chave no Google AI Studio:

- Documentacao oficial: https://ai.google.dev/gemini-api/docs/api-key
- Pagina de chaves: https://aistudio.google.com/apikey

Boas praticas:

- Nunca commite `.env` com chave real.
- Use chaves restritas ao Gemini API quando possivel.
- Em producao, prefira secret manager ou variaveis de ambiente do ambiente de deploy.

## Execucao

Instale as dependencias:

```bash
npm install
```

Execute a avaliacao:

```bash
npm run evaluate
```

Valide os cenarios sem executar a suite:

```bash
npm run validate:scenarios
```

Execute apenas uma categoria:

```bash
npm run evaluate:category -- Ofertas
```

Tambem e possivel usar o formato antigo, que continua sendo tratado como filtro de categoria:

```bash
npm run evaluate -- Compra
```

### Filtros por metadados

O runner aceita filtros por metadados do cenario. Os filtros sao case-insensitive e podem ser combinados:

```bash
npm run evaluate -- --category Compra
npm run evaluate -- --priority Critical
npm run evaluate -- --severity Major
npm run evaluate -- --type Regression
npm run evaluate -- --tag PCD
npm run evaluate -- --tag Compra
npm run evaluate -- --feature Compra
npm run evaluate -- --requirementId REQ-COMPRA-001
npm run evaluate -- --author "Caio Santos"
npm run evaluate -- --version 1.0
```

O filtro `--feature` aceita busca parcial. Por exemplo, `--feature Compra` encontra cenarios com `feature` igual a `Jornada de Compra`.

Tags podem ser mantidas como array no JSON ou importadas em formato texto com virgula ou ponto e virgula:

```json
["PCD", "Compra", "Regression"]
"PCD, Compra, Regression"
"PCD;Compra;Regression"
```

Exemplo com filtros combinados:

```bash
npm run evaluate -- --priority Critical --type Regression --tag PCD
```

Ao aplicar filtros, o terminal exibe os criterios usados:

```text
Applied filters:
priority=Critical
type=Regression
tag=PCD
```

Se nenhum cenario for encontrado, a execucao informa os filtros usados, por exemplo:

```text
Evaluation failed: No scenarios found for filters: priority=Critical, type=Regression, tag=PCD
```

O terminal exibira `PASS` ou `FAIL` para cada cenario.

## Quality Gates

Quality Gates transformam o resultado da avaliacao em uma decisao automatica para CI/CD. Quando o gate esta habilitado, o Athena compara as metricas da execucao com limites configurados e encerra com exit code `1` se qualquer criterio obrigatorio falhar. Sem `--quality-gate`, a avaliacao mantem o comportamento normal e o gate aparece como `DISABLED` nos relatorios.

Execute o gate para toda a suite ou combine-o com os filtros existentes:

```bash
npm run evaluate -- --quality-gate
npm run evaluate -- --quality-gate --priority Critical
npm run evaluate -- --quality-gate --tag Compra
```

Os criterios podem ser definidos no arquivo opcional `quality-gates.json` na raiz do projeto:

```json
{
  "minSuccessRate": 80,
  "minAvgScore": 70,
  "maxFailCount": 10,
  "maxErrorCount": 5,
  "maxRegressionCount": 0,
  "blockOnCriticalFailures": true
}
```

Se o arquivo nao existir, o Athena usa:

```json
{
  "minSuccessRate": 90,
  "minAvgScore": 80,
  "maxFailCount": 0,
  "maxErrorCount": 0,
  "maxRegressionCount": 0,
  "blockOnCriticalFailures": true
}
```

Criterios disponiveis:

- `minSuccessRate`: percentual minimo de cenarios com status `PASS`.
- `minAvgScore`: percentual medio minimo de `scorePercent`; nao altera o score original de 0 a 3.
- `maxFailCount`: quantidade maxima de cenarios `FAIL`.
- `maxErrorCount`: quantidade maxima de cenarios `ERROR`.
- `maxRegressionCount`: quantidade maxima de regressoes em relacao a execucao anterior.
- `blockOnCriticalFailures`: reprova quando qualquer cenario com `priority=Critical`, sem diferenca entre maiusculas e minusculas, termina diferente de `PASS`.

Quando ainda nao existe comparacao anterior, o criterio de regressoes fica como `SKIPPED`, assume zero regressoes e exibe:

```text
Regression gate skipped because no previous comparison is available.
```

Exemplo aprovado:

```text
Quality Gate: PASSED
Success Rate: 94% / Required: 90%
Avg Score: 92% / Required: 80%
Failures: 0 / Max: 0
Errors: 0 / Max: 0
Regressions: 0 / Max: 0
Critical Failures: 0 / Blocking: Yes
```

Exemplo reprovado:

```text
Quality Gate: FAILED
Success Rate: 76% / Required: 90%
Avg Score: 68% / Required: 80%
Failures: 8 / Max: 0
Errors: 2 / Max: 0
Regressions: 1 / Max: 0
Critical Failures: 1 / Blocking: Yes
```

Em CI/CD, basta usar o exit code do comando:

```bash
npm ci
npm run validate
npm test
npm run evaluate -- --quality-gate
```

Uma execucao aprovada retorna `0`; uma execucao reprovada pelo gate retorna `1`. O objeto `qualityGate` tambem e gravado em `report.json`, e o dashboard HTML mostra status, criterios, valores atuais e avisos.

## Relatorios

A execucao gera automaticamente:

- `reports/latest/report.json`: ultima execucao em formato estruturado.
- `reports/latest/report.html`: ultimo dashboard HTML gerado.
- `reports/history/{executionId}/report.json`: snapshot JSON historico da execucao.
- `reports/history/{executionId}/report.html`: snapshot HTML historico da execucao.
- `reports/history.json`: indice de execucoes com resumo, filtros aplicados e caminhos dos relatorios.
- `reports/comparison.json`: comparacao entre a ultima execucao e a execucao anterior mais recente, quando existir historico suficiente.
- `reports/report.json` e `reports/report.html`: aliases de compatibilidade apontando para a ultima execucao.

O `executionId` usa timestamp no formato `YYYY-MM-DD_HH-mm-ss`, por exemplo `2026-06-25_13-30-10`.

Estrutura:

```text
reports/
  latest/
    report.json
    report.html
  history/
    2026-06-25_13-30-10/
      report.json
      report.html
  history.json
  comparison.json
  report.json
  report.html
```

O `report.json` de cada execucao preserva os metadados opcionais de cada cenario quando eles existem no `prompts.json` ou nos arquivos importados. Ele tambem inclui:

- `executionId`
- `executedAt`
- `appliedFilters`
- `summary`
- `results`

O `history.json` preserva execucoes anteriores e adiciona a execucao mais recente no topo da lista.

### Comparacao entre execucoes

Quando existe uma execucao anterior no historico, o Athena compara automaticamente `reports/latest/report.json` com a execucao anterior mais recente registrada em `reports/history.json`.

O arquivo `reports/comparison.json` identifica:

- regressions, como `PASS -> FAIL`, `PASS -> ERROR`, queda de `scorePercent` ou piora de `overallStatus`;
- improvements, como `FAIL -> PASS`, `ERROR -> PASS`, aumento de `scorePercent` ou melhora de `overallStatus`;
- cenarios inalterados;
- cenarios novos e removidos quando as duas execucoes possuem o mesmo escopo;
- diferencas de escopo entre cenarios presentes apenas na execucao atual ou apenas na anterior;
- variacoes de `successRate`, `avgScore`, `errorCount` e `failCount`.

O campo `sameScope` indica se os `appliedFilters` das duas execucoes sao equivalentes. Ele e `true` quando ambas nao possuem filtros ou quando possuem o mesmo conteudo, independentemente da ordem das chaves e dos valores. Ele e `false` quando apenas uma execucao possui filtros ou quando as chaves ou valores sao diferentes.

Com `sameScope: true`, IDs presentes apenas na execucao atual entram em `newScenarios` e IDs presentes apenas na anterior entram em `removedScenarios`. Com `sameScope: false`, essas diferencas entram em `scopeDifferences.currentOnlyScenarios` e `scopeDifferences.previousOnlyScenarios`; `newScenarios` e `removedScenarios` permanecem vazios. Isso evita interpretar como remocao real um cenario que apenas ficou fora de um filtro como `--tag Compra`.

Regressoes e melhorias continuam sendo calculadas somente para IDs presentes nas duas execucoes. Assim, diferencas de filtro nao aumentam `regressionsCount` e nao afetam incorretamente o criterio `maxRegressionCount` dos Quality Gates.

Ao final da execucao, o terminal mostra um resumo:

```text
Comparison with previous execution:
Success Rate: 80% -> 60% (-20%)
Regressions: 3
Improvements: 2
New scenarios: 1
Removed scenarios: 0
Scope differences: 0
```

Quando os filtros sao diferentes, o terminal tambem exibe:

```text
Comparison scope warning:
Executions have different filters. Scenario differences may reflect filter scope, not actual additions/removals.
```

No `report.html`, o dashboard usa `title` no lugar do `id` quando disponivel, exibe `priority` e `severity` com badges coloridas e mostra `tags`, `feature` e `requirementId` no painel expandido de diagnostico.

O dashboard HTML tambem mostra a historia da qualidade da suite:

- `Execution Info`: exibe `executionId`, `executedAt`, provider, modelo, filtros aplicados e duracao da execucao. Quando nao ha filtros, exibe `Filters: None`.
- `Comparison with Previous Execution`: compara a execucao atual com a anterior e mostra success rate atual/anterior, delta de success rate, score medio atual/anterior, delta de score, regressions, improvements, cenarios novos, cenarios removidos e diferencas de escopo. Quando `sameScope` e `false`, a secao exibe um aviso visual de que as diferencas podem refletir filtros distintos.
- `Execution History`: lista as ultimas 10 execucoes registradas em `reports/history.json`, com totais, PASS, FAIL, ERROR, success rate, score medio e filtros aplicados.

Todos os textos visiveis do dashboard HTML sao padronizados em ingles. Datas e horarios sao exibidos no formato `DD/MM/YYYY HH:mm:ss`, usando o timezone `America/Sao_Paulo`. Duracoes sao exibidas de forma amigavel, como `245 ms` ou `1.2 s`. A secao `Execution History` fica recolhida por padrao e pode ser expandida com `Show History`, mantendo o dashboard limpo para leitura rapida.

Quando ainda nao existe execucao anterior, o dashboard exibe `No previous execution available for comparison yet.`. Quando o historico ainda nao existe ou esta vazio, exibe `No execution history available yet.`.

O dashboard possui uma camada segura de apresentacao para evitar dados incoerentes quando campos opcionais ou arquivos auxiliares estiverem ausentes. Metadados sem valor recebem fallback visual, filtros vazios aparecem como `None`, textos dinamicos sao escapados antes de entrar no HTML e calculos como taxa de sucesso, media de score e graficos sao protegidos contra divisao por zero. Quando uma avaliacao nao encontra cenarios para os filtros aplicados, o HTML exibe `No scenarios found for the applied filters.` em vez de quebrar ou mostrar `NaN`.

Os insights tambem diferenciam falhas de qualidade e erros tecnicos:

- `FAIL`: indica problema de qualidade da resposta, como regex, intent ou entity nao atendidos.
- `ERROR`: indica falha tecnica, configuracao ou provider, como timeout, rate limit, API key invalida ou `MISSING_RESPONSE` no modo mock.

Se `reports/history.json` ou `reports/comparison.json` ainda nao existirem, o dashboard continua funcionando e apresenta mensagens amigaveis como `No execution history available yet.` e `No previous execution available for comparison yet.`.

Interpretacao dos status:

- `PASS`: a resposta passou em regex, intent e entity.
- `FAIL`: o provider respondeu, mas alguma validacao falhou.
- `ERROR`: o provider falhou antes da validacao, por exemplo API key invalida, timeout, rate limit ou falha de conexao.

As estimativas de tokens sao aproximadas e calculadas localmente a partir do tamanho do texto.

Para abrir o HTML mais recente, execute `npm run evaluate` e abra `reports/latest/report.html` no navegador pelo explorador de arquivos. Para consultar execucoes antigas, use as pastas em `reports/history/`.

## Testes

```bash
npm test
```

## Integracao continua

O workflow `.github/workflows/ci.yml` executa em pushes e pull requests:

```text
npm ci
npm run build
npm test
npm run validate
npm run evaluate
```

O CI usa o `MockProvider` e nao executa `--quality-gate` como etapa obrigatoria nesta versao. A massa de demonstracao contem casos `FAIL` e `ERROR` intencionais para exercitar o dashboard e os diagnosticos; esses resultados nao representam falha tecnica do pipeline.

## Dashboard

O dashboard mais recente e gerado em `reports/latest/report.html`. Ele apresenta resumo da execucao, distribuicao de status, resultados por categoria, diagnosticos, Quality Gate, historico e comparacao com a execucao anterior.

A pasta `docs/images/` esta preparada para receber capturas versionadas do dashboard. Nenhuma imagem e publicada nesta versao enquanto nao houver um print definitivo revisado para portfolio.
