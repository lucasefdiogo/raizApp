---
id: HU-04
titulo: Motor de sessões sem liberação por tarefa
status: aprovada
versao: 1
produto: rootora
dados_sensiveis: nao
tem_tela: sim
muda_contrato: nao
---

## Contexto
O motor atual só libera o uso dos apps bloqueados depois de cumprir a tarefa essencial do dia, com um saldo de blocos que, ao zerar, bloqueia até o dia seguinte. Em uso real, isso levou a desativar o Accessibility Service para acessar algo sem alternativa dentro do app. Esta HU substitui a liberação condicionada por sessões disponíveis desde o início do dia, com pausa entre elas, mantendo a janela de horário e a máquina de estados já existente como base.

## Escopo
- Remoção dos estados A/C da `InterceptScreen` (liberação condicionada à tarefa essencial) e do ganho de blocos por tarefa extra.
- Sessão de uso de 15 minutos em primeiro plano, com aviso 1 minuto antes do fim, sem tolerância.
- Cooldown de 45 minutos entre sessões, com contagem regressiva visível ("próximo acesso em X min").
- Pausa de intenção com contagem de 10s na 1ª sessão do dia e +10s a cada sessão seguinte, até o teto de 60s.
- `blocosDiarios` passa a ter padrão "sem limite"; quando um valor numérico existir (configuração futura) e o saldo chegar a zero, a pessoa não fica bloqueada até o dia seguinte — o acesso rápido e a emergência continuam valendo (ambos na HU-05).
- Atualização de `resumoBloqueio`: remove `toleranciasUsadas`; mantém os demais campos.
- Os novos padrões (sessão, cooldown, pausa de intenção) valem imediatamente na atualização, sem passar por `regrasBloqueioPendentes`.
- Atualização das fixtures compartilhadas (`domain/__fixtures__/saldoBloqueio.json`) e das duas cópias da máquina de estados (`SaldoBloqueioMaquina.kt` e `domain/saldoBloqueio.ts`).
- Atualização de `docs/arquitetura/arquitetura.md` se a mudança afetar algo descrito lá (não deve mudar a stack).

## Fora de escopo
- Acesso rápido e saída de emergência (HU-05) — esta HU não pode ficar sozinha em produção sem a HU-05, porque o cooldown de 45 min sem nenhuma saída recria o motivo de desativar o serviço.
- Tolerância de +2 minutos (removida, não substituída nesta HU).
- Qualquer configuração de `blocosDiarios` pela tela (continua só editável no Firestore).
- Revisão semanal e desafios baseados no saldo.
- TravadoFlow e sessão de foco de 5 minutos (continuam como estão, só a entrada pelo estado A da InterceptScreen muda — ver RN-07).
- Coleta de uso (HU-02) e aviso de bloqueio desligado (HU-03).

## Regras de negócio
- RN-01: Ao abrir um app bloqueado dentro da janela de horário configurada, sem sessão nem cooldown ativos, a interceptação mostra a pausa de intenção, não os estados A/C.
- RN-02: A pausa de intenção tem um campo de texto opcional ("O que você vai fazer agora?") e o botão "Liberar" desabilitado por `SEQUENCIA_PAUSA_INTENCAO_SEG_V2` = [10, 20, 30, 40, 50, 60] segundos, pela posição da sessão já liberada no dia (1ª = 10s, 2ª = 20s, ..., 6ª em diante = 60s). Sair da tela reinicia a pausa.
- RN-03: Ao liberar, inicia uma sessão de 15 minutos. O tempo é contado globalmente (soma de todos os apps bloqueados) e só avança com um app bloqueado em primeiro plano; sair do app ou apagar a tela pausa a contagem. Teclado e barra de notificações não contam como saída.
- RN-04: Um minuto antes do fim da sessão, é mostrado um aviso não bloqueante ("1 minuto restante"). Ao fim dos 15 minutos, a sessão termina sem oferta de tolerância, e o cooldown começa.
- RN-05: O cooldown dura 45 minutos corridos (timestamp absoluto, sobrevive a fechar o app e reiniciar o aparelho). A interceptação mostra a contagem regressiva ("próximo acesso em X min") e os atalhos já existentes para sessão de foco (5 min) e tarefas extras.
- RN-06: Terminado o cooldown, a próxima tentativa de abrir um app bloqueado mostra a pausa de intenção de novo (RN-02), com a sequência avançando uma posição.
- RN-07: O botão "Estou travado" do estado A sai da InterceptScreen; o TravadoFlow continua acessível pela Home e pelo toque longo na tarefa, sem mudança no fluxo em si.
- RN-08: Sem `blocosDiarios` configurado (padrão), não há limite de sessões por dia: terminado um cooldown, sempre há uma próxima sessão disponível. Com `blocosDiarios` configurado como número e o saldo do dia chegando a zero, a interceptação não bloqueia até o dia seguinte: mostra a tela de saldo zerado com os atalhos de sessão de foco e tarefas extras, e não com a pausa de intenção.
- RN-09: `registrarResumoBloqueioNoDia` grava `sessoesUsadas` (contador) e `intencoes` (texto livre da pausa, como hoje); não grava mais `toleranciasUsadas`.
- RN-10: Na atualização, o valor efetivo de `duracaoBlocoMin`, `cooldownMin` e da sequência de pausa de intenção passa a ser o novo padrão para todo usuário, imediatamente, sem criar `regrasBloqueioPendentes`. Um `regrasBloqueioPendentes` já existente de uma alteração de apps ou janela não é afetado por esta mudança.
- RN-11: A máquina de estados muda de `BLOQUEADO_SEM_ESSENCIAL → AGUARDANDO_LIBERACAO ⇄ PAUSA_INTENCAO → BLOCO_ATIVO → TOLERANCIA → COOLDOWN → (AGUARDANDO_LIBERACAO | SALDO_ZERADO)` para `AGUARDANDO_LIBERACAO ⇄ PAUSA_INTENCAO → SESSAO_ATIVA → COOLDOWN → (AGUARDANDO_LIBERACAO | SALDO_ZERADO)`. `SALDO_ZERADO` só é alcançável com `blocosDiarios` configurado. A virada do dia reinicia qualquer estado para `AGUARDANDO_LIBERACAO`.

## Critérios de aceitação
- CA-01 (feliz): Abrir um app bloqueado pela primeira vez no dia, dentro da janela configurada, mostra a pausa de intenção com o botão desabilitado por 10 segundos.
- CA-02 (feliz): Liberar a pausa inicia uma sessão de 15 minutos contados só com o app em primeiro plano; apagar a tela por 2 minutos e retomar não avança os 2 minutos no contador.
- CA-03 (feliz): Faltando 1 minuto para o fim da sessão, aparece o aviso "1 minuto restante"; ao completar os 15 minutos, a sessão termina e o cooldown de 45 minutos começa, mostrando "próximo acesso em 45 min" e diminuindo com o tempo.
- CA-04 (feliz): A 2ª sessão liberada no mesmo dia mostra a pausa de intenção com 20 segundos de espera.
- CA-05 (feliz): Sem `blocosDiarios` configurado, depois do cooldown da 5ª sessão do dia a interceptação oferece uma 6ª sessão normalmente, com a pausa em 60 segundos.
- CA-06 (exceção): Com `blocosDiarios` igual a 2 e as 2 sessões já usadas no dia, a interceptação mostra a tela de saldo zerado com os atalhos de sessão de foco e tarefas extras, sem oferecer nova sessão e sem a pausa de intenção.
- CA-07 (exceção): Uma tarefa extra concluída com `blocosDiarios` configurado e saldo zerado tira a interceptação do estado de saldo zerado, voltando a `AGUARDANDO_LIBERACAO` para a próxima tentativa.

## Estados de tela
- Protótipo: docs/design/prototipo/intercept-sessoes.html
- Estados:
  - normal: pausa de intenção com o contador e o campo de intenção
  - carregando: sessão ativa, mostrando o tempo restante da sessão
  - erro: cooldown em andamento (não é falha, mas é o estado "não disponível agora" com a contagem regressiva; reaproveita a semântica de "aguarde" do protótipo)

## Arquitetura e stack
- Referência: docs/arquitetura/arquitetura.md
- Não muda a stack. A máquina de estados continua em `SaldoBloqueioMaquina.kt` (autoridade) com a cópia de referência em `domain/saldoBloqueio.ts`, testadas pelas mesmas fixtures (`domain/__fixtures__/saldoBloqueio.json`, lidas por Jest e JUnit). Teste JUnit roda com `cd android && ./gradlew :app:testDebugUnitTest` e é registrado no progress.md (não roda no CI).

## Contratos
Não se aplica.

## Dados e LGPD
Não se aplica.

## Requisitos não funcionais
- Confiabilidade: o cooldown e a sessão ativa sobrevivem a fechar o app e reiniciar o aparelho (timestamp absoluto, não contador relativo).
- Acessibilidade: o tempo restante da sessão e do cooldown é lido pelo leitor de tela como texto, não só visualmente.
- Copy: segue as regras do projeto (sem culpa, sem exclamação); nenhum texto usa "proteção" (reservada ao streak).

## Dúvidas abertas
