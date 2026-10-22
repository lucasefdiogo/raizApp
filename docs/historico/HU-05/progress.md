# Progress — HU-05

Planejamento: HU pronta, branch feature/HU-05-acesso-rapido-emergencia
Entrega: plano aprovado
Task ativa: TASK-01
TASK-01: acessoRapido.ts com cota 3, intervalos 15/30/60 min do fim do acesso anterior, disponibilidade e emergenciaOferecida (objeto com sessaoAtiva, cooldownLiberavel, acessoRapido, agora); estado próprio EstadoAcessoRapido, a TASK-02 o liga ao EstadoSaldo.
Task ativa: nenhuma
Task ativa: TASK-02
TASK-02: liberarAcessoRapido/concluirEmergencia em saldoBloqueio.ts com relógio próprio (liberacaoRapida*), cooldown e consumo da sessão intocados; permiteUso segue só para SESSAO_ATIVA, a TASK-04 deve usar permiteUso || acessoRapidoLiberado; fixtures com 5 casos novos para o Kotlin. 1 rodada de correção (faltava prova do vermelho no Jest).
Task ativa: nenhuma
Task ativa: TASK-03
TASK-03: cópia Kotlin das transições (campos achatados acessoRapidoUsos/FimUltimoEm, liberacaoRapida*), Prefs persiste os 5 campos com default de cota cheia. JUnit (cd android && ./gradlew :app:testDebugUnitTest --offline): 35 testes, 0 falhas. Teste CA-04 extra cobre a fixture da emergência oferecida. Pendente na TASK-04: teste CA-02 de leitura de estado sem campos.
Task ativa: nenhuma
Task ativa: TASK-04
TASK-04: módulo nativo liberarAcessoRapido()/concluirEmergencia() resolvem JSON {aceito, visao}; visão ganha msRestantesLiberacaoRapida, acessosRapidosRestantes, msAteProximoAcessoRapido (ausente = cota esgotada), emergenciaOferecida; Service usa appPodeAbrir = permiteUso || acessoRapidoLiberado e agenda o timer pelo que esgotar primeiro. JUnit 38 testes, 0 falhas; assembleDebug ok. Não conferido em aparelho real: reabertura da interceptação ao fim da liberação rápida.
Task ativa: nenhuma
Task ativa: TASK-05
TASK-05: registrarResumoBloqueioNoDia aceita acessosRapidos e emergencias no objeto parcial (increment atômico, só se diferente de zero); ResumoBloqueioDia ganha os dois como opcionais (dia antigo = 0). Doc a atualizar: definition/schema-firebase.md (resumoBloqueio.acessosRapidos e .emergencias).
Task ativa: nenhuma
Task ativa: TASK-06
TASK-06: useBloqueioSaldo expõe acessoRapidoDisponivel, esperaAcessoRapidoSeg (5), acessosRapidosRestantes, msAteProximoAcessoRapido, emergenciaOferecida e liberarAcessoRapido()/concluirEmergencia() (Promise<boolean>, registram o resumo só se aceito). 1 rodada de correção (constante duplicada, agora importa ACESSOS_RAPIDOS_DIARIOS).
Task ativa: nenhuma
Task ativa: TASK-07
TASK-07: AcessoRapidoOpcoes (botão com espera de 5 s, "próximo acesso rápido em X min", emergência só se oferecida), RespiracaoEmergenciaScreen (60 s, sem pular, onConcluir) e EsperaBloqueioScreen com props opcionais; textos acessíveis com live region. Ligação com hook/nativo fica na TASK-08. Não conferido em aparelho real.
Task ativa: nenhuma
Task ativa: TASK-08
TASK-08: InterceptScreen liga EsperaBloqueioScreen ao hook; acesso rápido chama liberarAcessoRapido() e abre o app se aceito; emergência mostra a respiração de 60 s e chama concluirEmergencia(); recusa do nativo na emergência volta ao modo principal (robustez, fora da spec). InterceptRoot não mudou.
Task ativa: nenhuma
Entrega: tasks concluídas
Validação: verify 7/7 verde; lux-revisor APROVADO. E2E: sem executor configurado. Melhorias não bloqueantes do revisor: teste de tela para "em 15 min" e "em 30 min" (CA-03), saída de primeiro plano no meio da emergência (RN-07), e manter registrado o JUnit (38 testes, 0 falhas; não roda no CI). Doc a atualizar: definition/schema-firebase.md (resumoBloqueio.acessosRapidos/.emergencias) e definition/regras-de-negocio.md (acesso rápido e emergência).
Entrega: validação aprovada
Entrega: merge feito, aguardando push — **[Arquivado em 2026-10-22: o fluxo de HU do lux kit foi abandonado; push confirmado: main e origin/main em ac8b7ef.]**
