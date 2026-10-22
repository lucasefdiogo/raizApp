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
Validação: `git merge main` feito sem conflito (só .lux/lux.py). `verify.py` parou com `ÁRVORE: 1 arquivo(s) com alterações não commitadas`: `.bash_profile` (nó /dev/null do sandbox) ficou fora do .git/info/exclude do Lucas. Necessidade fora da cerca: o Lucas precisa acrescentar `.bash_profile` ao .git/info/exclude. **[Ainda aberto: movido para /TODO.md]** Também pendente no terminal do Lucas: compilar o Kotlin (`RootoraUsoAppsModule.kt`), que o sandbox não consegue. Aviso: `e2e detectar` disse que não há executor de E2E configurado na main (a HU tem tela; sem task e2e no plano).
Validação: `verify` 8/8 verde (1ª rodada falhou por timeouts intermitentes em ReauthPromptModal, TarefasExtrasScreen e BloqueioAppsScreen sob carga; passam isolados e a 2ª rodada fechou verde). `lux-revisor` REPROVADO: RN-05 pede coleta a cada volta ao primeiro plano e `useColetaUsoApps` só roda na montagem (sem AppState).
Entrega: validação reprovada (1/3)
Correção 1/2 (cc5ce05): `useColetaUsoApps` passa a coletar a cada AppState `active` (RN-05), com testes de CA-04/CA-05 reforçados. O verify seguinte pegou regressão em `HojeStack.test.tsx` (o preset do RN devolve undefined em `AppState.addEventListener`); corrigida mockando `useColetaUsoApps` no arquivo, como os demais hooks da Home.
Validação: verify 8/8 verde; lux-revisor APROVADO na 2ª rodada (RN-05 resolvida); revisão de segurança (dados_sensiveis: sim) sem achados reais (2 observações baixas: firestore.rules não valida o formato de `usoApps`; `classe` do evento não vai ao Firestore). Melhorias conhecidas para a CHORE pós-merge: atualizar /definition, reformatação em androidManifest.test.ts e BloqueioAppsScreen.test.tsx, regra do progress.ts abrangente a qualquer log sem tarefas.
Entrega: validação aprovada
Entrega: CI vermelho (1/3) — não é falha da HU: o run 39352051051 (SHA f9b7332) falhou no step "Instalar dependências" (exit 2), antes dos testes; a `main` (run 39346279073) e as branches anteriores falham no mesmo step. Log inacessível daqui (TLS timeout em results-receiver.actions.githubusercontent.com). Conserto exige olhar o log e provavelmente mexer em `.github/workflows/lux.yml` ou no lockfile, fora do escopo da HU e de arquivo protegido: decisão do Lucas. Merge não feito (portão exige CI verde). Esta nota ficou sem commit para não invalidar a validação.
CI dispensado pelo Lucas — falha preexistente do lux.yml, não relacionada à HU. Correção do kit fica para uma CHORE.
Entrega: merge feito, aguardando push — **[Arquivado em 2026-10-22: o fluxo de HU do lux kit foi abandonado; push confirmado: main e origin/main em ac8b7ef.]**
