# Progress — HU-03

Planejamento: HU pronta, branch feature/HU-03-aviso-bloqueio-desligado
Entrega: plano aprovado
Task ativa: TASK-01
TASK-01: funções puras de lembrete (horários, textos, exibir, registrar na abertura) em domain/avisoBloqueio.ts com fixture compartilhada para o espelho Kotlin da TASK-08. Suíte 1160 verde.
Task ativa: nenhuma
Task ativa: TASK-02
TASK-02: agruparEventosPorDia em domain/acessibilidade.ts (dia local, dedupe, ISO inválido ignorado) e campo acessibilidade no DailyLog. Suíte 1163 verde.
Task ativa: nenhuma
Task ativa: TASK-03
TASK-03: construída (gravarAcessibilidadeNoDia + leitura em buscarDailyLog; suíte 1167 verde), mas NÃO commitada. Auditoria (pacote 1) parou: [suspeito] src/services/firestore.test.ts — o diário não mostra teste falhando antes do código de produção (testes e implementação foram escritos juntos, execução única com exit 0). Veredito: .lux/vereditos/correcao-HU-03-TASK-03.md. Alterações da task seguem no working tree.
Entrega: auditoria parou a TASK-03
TASK-03 (rodada de correção por decisão do Lucas): firestore.ts revertido, testes mantidos; stub de gravarAcessibilidadeNoDia com payload errado (statusDia extra, sem arrayUnion, sem merge) escrito ANTES da execução vermelha. Falha registrada no diário (4 testes vermelhos por asserção): CA-05 arrayUnion nunca chamado; CA-08 payload com chaves ['statusDia','acessibilidade']; CA-08 sem eventos gravou; CA-05 buscarDailyLog sem acessibilidade. Depois a implementação real foi reaplicada: suíte 1167 verde, tsc e lint sem erros.
TASK-03: auditoria aprovada no pacote 2 após o vermelho registrado.
Entrega: plano aprovado
Task ativa: nenhuma
Task ativa: TASK-04
TASK-04: comportamento já existia (HU-02, log sem tarefas nem escudo = sem_registro); só testes CA-08 de acessibilidade em progress e useStreak, com dente provado por mutação temporária revertida. Suíte 1169 verde.
Task ativa: nenhuma
Task ativa: TASK-05
TASK-05: wrapper src/native/EventosAcessibilidade.ts (lerEventosAcessibilidadePendentes, marcarEventosAcessibilidadeEnviados, verificarDesligamentoNaAbertura, espelharNotificacoesAtivas); contrato que a TASK-09 implementa no módulo Kotlin. Sem módulo resolve vazio; rejeição nativa passa adiante (hook da TASK-06 trata). Suíte 1175 verde.
Task ativa: nenhuma
Task ativa: TASK-06
TASK-06: useSincronizarAcessibilidade (espelha notificacoesAtivas, verifica desligamento, grava eventos por dia, só marca enviados se tudo gravou) ligado na HomeScreen. Desvio mínimo aceito pelo auditor: uma linha jest.mock em src/navigation/HojeStack.test.tsx (fora do Escopo), necessária porque ele renderiza a Home real. Suíte 1181 verde.
Task ativa: nenhuma
Task ativa: TASK-07
TASK-07: alternarNotificacoes em usePerfil espelha notificacoesAtivas no nativo após gravar no Firestore (não espelha se a gravação falhar). Suíte 1184 verde.
Task ativa: nenhuma
Task ativa: TASK-08
TASK-08: espelho Kotlin AvisoDesligamentoMaquina validado por JUnit sobre a mesma fixture (5 testes, 0 falhas; cd android && ./gradlew :app:testDebugUnitTest --tests *AvisoDesligamentoMaquinaTest* --offline). Ressalva: o vermelho (5 falhas contra stub) está só no relato do construtor, o diário não o registra em linha própria; auditor aceitou porque o código espelha o TS e a fixture é a mesma.
Task ativa: nenhuma
Task ativa: TASK-09
TASK-09: AvisoDesligamentoPrefs (lógica pura de log de eventos + camada SharedPreferences), onUnbind/onServiceConnected registrando eventos, 4 métodos no módulo RootoraAccessibility conforme o contrato TS. JUnit 8/8, suíte 1185 verde, compileDebugKotlin ok. Decisões: primeira conexão sem desligamento prévio não grava religamento; notificacoesAtivas nativo começa true até o JS espelhar; eventos enviados ficam no log (TASK-10 precisa de getter do horário do desligamento). Sem teste automatizado para a camada com Context nem para o Service.
Task ativa: nenhuma
Task ativa: TASK-10
TASK-10: agendamento AlarmManager inexato (setAndAllowWhileIdle, sem SCHEDULE_EXACT_ALARM), AvisoDesligamentoReceiver (RN-03 + canal lembretes-rootora + areNotificationsEnabled), BootReceiver (reagenda), permissão RECEIVE_BOOT_COMPLETED, arquitetura.md atualizada. Receivers exported=false. Jest 1187, JUnit, compileDebugKotlin e processDebugManifest ok. NÃO testado automaticamente (precisa de aparelho): disparo do alarme/Doze, reagendamento após reboot, notificação real, ausência de POST_NOTIFICATIONS, cancelamento ao religar. Ícone da notificação usa o ic_launcher (pode aparecer quadrado).
Task ativa: nenhuma
Task ativa: TASK-11
TASK-11: toque na notificação grava destino pendente (MainActivity onCreate/onNewIntent), módulo consumirDestinoNotificacao (consumo único), hook useAbrirDestinoDaNotificacao navega para PerfilTab>BloqueioApps na montagem e a cada AppState active, ligado na Home. Desvio mínimo aceito: uma linha jest.mock em src/navigation/HojeStack.test.tsx. Suíte 1196 verde. Limitação: toque com o app já em primeiro plano só é tratado na próxima ativação. Parte Kotlin sem teste automatizado.
Entrega: tasks concluídas
Task ativa: nenhuma
Validação (tentativa 1): verify 8/8 verde; lux-revisor REPROVADO. Achado que bloqueia: CA-04 — com o app já em primeiro plano o toque cai em MainActivity.onNewIntent, sem mudança de AppState, e nada navega. Correção: onNewIntent emite um evento ao JS e o hook useAbrirDestinoDaNotificacao o escuta (teste primeiro). Melhorias do revisor não aplicadas nesta rodada: decisão agendar/cancelar sem função pura/JUnit, montagem de CondicoesExibicao no Receiver sem teste, default nativo de notificacoesAtivas = true até o JS espelhar, testes de manifesto com ID de CA, ids CA repetidos entre HUs no verification.md, teste de Prefs com notificacoesAtivas falso.
Entrega: validação reprovada (1/3)
Task ativa: TASK-11
Correção da tentativa 1: MainActivity.onNewIntent emite o evento destino-notificacao ao JS e o hook o escuta (reexecuta se chegar durante um consumo). Vermelho registrado (2 falhas por asserção), suíte 1199 verde. Depende de teste manual: toque com o app em primeiro plano, segundo plano e fechado.
Task ativa: nenhuma
Validação (tentativa 2): verify 8/8 verde; lux-revisor APROVADO (achado do CA-04 resolvido); /security-review sem achados (confiança < 8; manifesto, PendingIntents, extra destino, SharedPreferences, módulo nativo, Firestore e logs verificados). Pendente de teste manual em aparelho: disparo do alarme (Doze), reagendamento após reboot, notificação real, toque em primeiro plano / segundo plano / app fechado, ausência de POST_NOTIFICATIONS. **[Ainda aberto: movido para /TODO.md]** Melhorias do revisor não aplicadas: decisão agendar/cancelar sem função pura, montagem de CondicoesExibicao no Receiver sem teste, default nativo notificacoesAtivas=true até o JS espelhar, testes de manifesto com ID de CA, ícone da notificação = ic_launcher, checagem do serviço duplicada.
Entrega: validação aprovada
Entrega: merge feito, aguardando push — **[Arquivado em 2026-10-22: o fluxo de HU do lux kit foi abandonado; push confirmado: main e origin/main em ac8b7ef.]**
