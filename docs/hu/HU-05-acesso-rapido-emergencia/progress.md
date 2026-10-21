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
