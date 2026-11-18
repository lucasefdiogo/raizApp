# Plano de implementação — Momento de foco

1. Criar testes Kotlin para o prazo temporário: apps selecionados, janela ignorada durante o foco, expiração e limpeza. Implementar armazenamento e precedência no `BloqueioPrefs`.
2. Criar ponte nativa para iniciar, consultar e encerrar o modo e passar a flag pela `InterceptActivity`. Cobrir a ponte TypeScript com Jest.
3. Criar a tela de interceptação do foco com retorno ao Rootora e saída explícita. Cobrir os dois caminhos com teste de componente.
4. Criar entrada **Começar** em tarefa pendente, tela inicial com duração e ajuda opcional, e ligar a `SessaoFocoScreen` à tarefa. Cobrir o fluxo na Home/TaskItem e a saída da sessão.
5. Tornar o cronômetro baseado em prazo absoluto, incluindo retorno do app ao primeiro plano, e limpar o modo temporário em término, parada e desmontagem. Cobrir no hook.
6. Atualizar `docs/projeto/regras-de-negocio.md`, arquitetura e texto legal pertinente. Rodar Jest, ESLint, TypeScript e testes Kotlin; revisar o diff e fazer merge local `--no-ff` na main. Validar em aparelho físico quando disponível.
