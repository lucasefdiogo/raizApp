# Progress — HU-02

Planejamento: HU pronta, branch feature/HU-02-coleta-uso-redes
Entrega: plano aprovado
Task ativa: TASK-01

Auditoria da TASK-01: `lux auditar-task HU-02 TASK-01 --nova` saiu com 11 ("mudança em arquivo protegido: .mcp.json").
Evidência de falso positivo, a confirmar pelo Lucas: `.mcp.json` (e .bashrc, .gitconfig, .gitmodules, .profile, .ripgreprc, .vscode, .zprofile, .zshrc) são nós /dev/null (char device 1,3, dono nobody) montados pelo sandbox na raiz; já apareciam como `??` antes de qualquer task (`git status` do passo de planejamento) e não são arquivos reais. O código da TASK-01 está só no working tree (não commitado): src/domain/usoApps.ts, usoApps.test.ts, types.ts.
Entrega: auditoria parou a TASK-01
TASK-01 concluída: agregação pura de eventos de primeiro plano em `usoApps` (src/domain/usoApps.ts) com testes por CA. Commit a pedido do Lucas apesar da auditoria ter parado com 11 (falso positivo dos nós /dev/null do sandbox, a confirmar).
Task ativa: nenhuma
Auditoria da TASK-01 refeita após o Lucas ocultar os nós /dev/null do sandbox: ok.
TASK-02 concluída: wrapper `src/native/UsoApps.ts`, módulo Kotlin `RootoraUsoAppsModule.kt`, permissão `PACKAGE_USAGE_STATS` no manifesto e arquitetura atualizada. Auditoria ok. Pendência: o Kotlin nunca foi compilado (gradle falha no ksp de async-storage dentro do sandbox); compilar no terminal do Lucas antes do merge.
Task ativa: nenhuma
TASK-03 concluída: `gravarUsoAppsNoDia` (merge em dailyLogs), `useColetaUsoApps` (só com consentimentoAcessoUso e acesso de uso) chamado pela Home. Auditoria: 1 correção (formatação alheia em HomeScreen.test.tsx), ok na rodada 2. `buscarDailyLog` passou a devolver `usoApps`. `schema-firebase.md` ainda não documenta `usoApps` nem `consentimentoAcessoUso` (sinalizar no fim da HU).
Task ativa: nenhuma
TASK-04 concluída: `avaliarStatusHistoricoDia` trata dailyLog passado sem tarefas e sem escudo (ex.: só `usoApps`) como `sem_registro`; teste de streak do CA-08 passou sem mudar `useStreak.ts` (vermelho não provado por mutação). Auditoria ok de primeira. Rever em /definition textos sobre o status `perdido` de dia sem tarefas.
Task ativa: nenhuma
TASK-05 concluída: `DivulgacaoAcessoUsoScreen` (estados normal e sem-permissao), hooks `useAcessoUso` e `useConsentimentoAcessoUso`, `registrarConsentimentoAcessoUso`, rota `DivulgacaoAcessoUso` no PerfilStack e entrada "Medir tempo nas redes" na BloqueioAppsScreen. Auditoria: 1 correção (fechamento automático fora da spec, removido); ok na rodada 2. Em /definition faltam `usoApps`, `consentimentoAcessoUso` e a rota `DivulgacaoAcessoUso`.
Entrega: tasks concluídas
Task ativa: nenhuma
