---
id: HU-03
titulo: Aviso de bloqueio de apps desligado
status: aprovada
versao: 1
produto: rootora
dados_sensiveis: sim
tem_tela: nao
muda_contrato: nao
---

## Contexto
Desligar o Accessibility Service nas configurações do Android é sempre possível e o app não pode impedir isso. O problema observado é que a pessoa desliga para acessar algo e não religa mais. Esta HU registra cada desligamento e religamento e lembra a pessoa, sem cobrança, de religar o bloqueio de apps.

## Escopo
- Registro nativo do desligamento (`onUnbind`) e do religamento (`onServiceConnected`) do Accessibility Service, com data e hora, mesmo com o app fechado.
- Agendamento nativo (`AlarmManager`) de até dois lembretes por desligamento, cancelados no religamento.
- Notificação local no mesmo canal já usado pelo `@notifee`, que abre a `BloqueioAppsScreen` ao ser tocada.
- Checagem de reserva a cada abertura do app, para o caso de o sistema encerrar o serviço sem chamar `onUnbind`.
- Sincronização dos eventos registrados no nativo para `dailyLogs/{data}.acessibilidade` na abertura do app.
- Atualização de `docs/arquitetura/arquitetura.md` para citar o registro de eventos do serviço e o agendamento nativo.

## Fora de escopo
- Aviso dentro do app (banner na Home ou em outra tela).
- Compromisso social (avisar um contato escolhido).
- Qualquer tentativa de impedir ou dificultar a desativação do Accessibility Service.
- Mudanças no motor de liberação e na coleta de uso (HU-02).
- Tela que mostre o histórico de desligamentos.

## Regras de negócio
- RN-01: Ao ser desligado, o serviço grava localmente o horário do desligamento (ISO 8601) e agenda os lembretes. Ao ser religado, grava localmente o horário do religamento e cancela os lembretes pendentes.
- RN-02: Lembretes de um desligamento: o 1º no dia seguinte ao desligamento, às 09:00 do horário do aparelho; o 2º três dias depois do 1º, às 09:00. Não há outros lembretes para o mesmo desligamento.
- RN-03: Um lembrete só é exibido se, no momento de disparar, o serviço continuar desligado, `regrasBloqueio` existir, o serviço já tiver sido ativado ao menos uma vez e `notificacoesAtivas` for verdadeiro. Se alguma condição falhar, o lembrete é descartado sem aviso.
- RN-04: Textos da notificação. Título: "Bloqueio de apps desligado". Corpo do 1º lembrete: "Desligado desde ontem. Toque para religar quando quiser." Corpo do 2º lembrete: "Desligado há alguns dias. Toque para religar quando quiser."
- RN-05: Tocar na notificação abre o app na `BloqueioAppsScreen`.
- RN-06: Na abertura do app, se o serviço estiver desligado e não houver desligamento registrado desde o último religamento, o app registra o desligamento com o horário da checagem e agenda os lembretes como na RN-02.
- RN-07: Na abertura do app, os eventos locais ainda não enviados vão para `dailyLogs/{YYYY-MM-DD do evento}.acessibilidade.desligadoEm[]` e `.religadoEm[]` (ISO 8601) via `arrayUnion`, e são marcados como enviados. Reenviar o mesmo evento não o duplica.
- RN-08: Gravar `acessibilidade` num dia nunca altera `tarefas`, `statusDia`, `escudoUsado` nem os demais campos do `dailyLog`. Um `dailyLog` que passa a existir só por causa de `acessibilidade` não muda o streak nem o status do dia no Progresso.
- RN-09: Nenhum texto desta HU usa a palavra "proteção"; ela é reservada ao escudo do streak.

## Critérios de aceitação
- CA-01 (feliz): Desligar o serviço às 22:00 de um dia agenda um lembrete para as 09:00 do dia seguinte com o título "Bloqueio de apps desligado" e o corpo "Desligado desde ontem. Toque para religar quando quiser."
- CA-02 (feliz): Se o serviço continuar desligado, um 2º lembrete é exibido três dias depois do 1º, às 09:00, com o corpo "Desligado há alguns dias. Toque para religar quando quiser.", e nenhum outro lembrete é agendado depois dele.
- CA-03 (feliz): Religar o serviço antes das 09:00 do dia seguinte cancela os lembretes, e nenhuma notificação é exibida.
- CA-04 (feliz): Tocar na notificação abre o app na tela "Bloqueio de apps".
- CA-05 (feliz): Na abertura seguinte do app, o desligamento e o religamento aparecem em `dailyLogs/{dia do evento}.acessibilidade.desligadoEm` e `.religadoEm`, sem duplicar em aberturas posteriores.
- CA-06 (exceção): Com `notificacoesAtivas` falso, o lembrete não é exibido, mas o desligamento continua registrado.
- CA-07 (exceção): Se o sistema encerrar o serviço sem chamar `onUnbind`, a abertura seguinte do app registra o desligamento e agenda os lembretes.
- CA-08 (exceção): Um dia passado sem `dailyLog` que recebe só `acessibilidade` mantém o mesmo streak e o mesmo status no Progresso que teria sem esse documento.

## Estados de tela
Não se aplica.

## Arquitetura e stack
- Referência: docs/arquitetura/arquitetura.md
- Não muda a stack: `AlarmManager` e `NotificationManager` são APIs do Android, sem pacote novo. As regras de agendamento (RN-02) e de exibição (RN-03) vivem como funções puras testadas. Se ficarem no Kotlin, o teste é JUnit, rodado com `cd android && ./gradlew :app:testDebugUnitTest` e registrado no progress.md (o Gradle não roda no CI).

## Contratos
Não se aplica.

## Dados e LGPD
- Dados: data e hora de cada desligamento e religamento do Accessibility Service do Rootora.
- Base legal: execução do serviço solicitado pelo titular (art. 7º, V, da LGPD), o bloqueio de apps que a própria pessoa configurou.
- Retenção: enquanto a conta existir; apagados na exclusão de conta junto com `dailyLogs`.

## Requisitos não funcionais
- Confiabilidade: o registro e o agendamento funcionam com o app fechado e sobrevivem à reinicialização do aparelho (lembretes pendentes são reagendados no boot).
- Notificação: respeita a permissão `POST_NOTIFICATIONS`; sem ela, nada é exibido e nada quebra.
- Copy: segue as regras do projeto (verbo no início quando houver, sem exclamação, sem cobrança).

## Dúvidas abertas
