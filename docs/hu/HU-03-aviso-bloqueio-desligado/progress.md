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
