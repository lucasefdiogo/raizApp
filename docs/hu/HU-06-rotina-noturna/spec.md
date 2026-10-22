---
id: HU-06
titulo: Rotina estimada e janela noturna
status: aprovada
versao: 2
produto: rootora
dados_sensiveis: sim
tem_tela: sim
muda_contrato: nao
---

## Contexto
A HU-02 coleta o uso de apps no aparelho, mas só guarda segundos e número de aberturas por app e por dia — sem horário algum, porque `agregarUsoPorDia` soma os eventos e descarta o momento em que ocorreram. A estimativa de rotina desta HU precisa de horário para existir, então o escopo cresce para incluir essa extensão da coleta, dentro da própria HU-06 (ver "Dúvidas abertas" da v1 e a proposta P-01 registrada no `progress.md`). Com a rotina estimada e confirmada, a janela noturna passa a aplicar uma fricção maior nos minutos antes de dormir, com uma mensagem contextual em vez do texto padrão da pausa de intenção (HU-04), porque é o momento em que a rolagem tende a comer o tempo de sono.

## Escopo
- Extensão da coleta de uso da HU-02: `dailyLogs/{data}.usoApps` passa a gravar, por app, `primeiroUsoDia` e `ultimoUsoAntesPausaLonga` (horário ISO 8601 local), calculados por `agregarUsoPorDia` a partir dos `EventoUso` do dia. Inclui a atualização do módulo nativo (`RootoraUsoAppsModule.kt`), de `gravarUsoAppsNoDia` e das regras do Firestore para aceitar os dois campos novos.
- Estimativa da rotina (horário de dormir e de acordar) a partir desses dois campos, sem exigir nenhuma pergunta no onboarding.
- Tela única de confirmação da rotina estimada, oferecida uma vez quando há dados suficientes; sem confirmação, a janela noturna não é ativada.
- Pergunta opcional, única, sobre uma alternativa noturna da própria pessoa (o que fazer à noite no lugar das redes), editável depois no Perfil.
- Janela noturna: dos 30 minutos antes do horário de dormir confirmado até o horário de acordar confirmado.
- Dentro da janela noturna, a pausa de intenção da HU-04 usa uma sequência de espera maior (dobra a posição atual da sequência) e troca o texto padrão por uma mensagem contextual rotativa, com uma referência à alternativa noturna quando ela existir.
- Banco de mensagens rotativas da janela noturna, tema `noturno`, no formato de `banco-de-frases.md`.
- `users/{uid}.rotina` com os horários estimados/confirmados e a alternativa noturna.
- Atualização de `docs/arquitetura/arquitetura.md` se necessário (não deve mudar a stack).

## Fora de escopo
- Mudança nos campos já existentes de `usoApps` (`segundos`, `aberturas`) ou em qualquer tela que já leia esses dois campos.
- Backfill de `primeiroUsoDia`/`ultimoUsoAntesPausaLonga` para dias anteriores à atualização do app — dias sem os campos novos não contam para a janela de 5 dias da RN-03.
- Qualquer fricção ou mensagem na parte da manhã (evidência insuficiente para justificar).
- Mudança na duração da sessão, do cooldown ou do acesso rápido/emergência (HU-04 e HU-05) fora da sequência de pausa de intenção dentro da janela noturna.
- Revisão semanal, desafios e qualquer gamificação sobre a rotina (etapas seguintes do roteiro).
- Conteúdo bíblico nas mensagens noturnas (decisão em aberto no roadmap, fora desta HU).

## Regras de negócio
- RN-01: `agregarUsoPorDia` passa a calcular, além de `segundos` e `aberturas` por app, `primeiroUsoDia` (horário do primeiro `EventoUso` do dia, de qualquer app bloqueado) e `ultimoUsoAntesPausaLonga` (horário do último `EventoUso` antes de um intervalo de pelo menos 3 horas sem nenhum evento). Os dois valores em ISO 8601, horário local do aparelho, gravados uma vez por dia em `dailyLogs/{data}.usoApps` (não por app).
- RN-02: `gravarUsoAppsNoDia`, `RootoraUsoAppsModule.kt` e as regras do Firestore são atualizados para aceitar e persistir os dois campos da RN-01, sem alterar `segundos` nem `aberturas`.
- RN-03: A estimativa de rotina roda sobre `primeiroUsoDia` (proxy de "acordar") e `ultimoUsoAntesPausaLonga` (proxy de "dormir") dos `dailyLogs` que já têm os dois campos (RN-01). A estimativa só é calculada com pelo menos 5 dias com esses campos no histórico; dias anteriores à atualização do app, sem os campos, não contam.
- RN-04: Calculada a estimativa, e sem `rotina.confirmadoEm` preenchido, a tela de confirmação é mostrada uma vez (na próxima abertura do app). Confirmar grava `rotina.dormirEstimado`, `rotina.acordarEstimado` e `rotina.confirmadoEm`. "Ajustar horário" permite editar os dois valores antes de confirmar.
- RN-05: Sem `rotina.confirmadoEm` preenchido, a janela noturna não é aplicada em nenhuma interceptação — a pausa de intenção da HU-04 segue com a sequência e o texto padrão.
- RN-06: Depois da confirmação (RN-04), a tela de alternativa noturna é mostrada uma única vez, na sequência. Responder grava `rotina.alternativaNoturna` (texto livre). "Agora não" não grava nada e não repete a pergunta — a alternativa continua editável depois pelo Perfil.
- RN-07: A janela noturna vai de 30 minutos antes de `rotina.dormirEstimado` até `rotina.acordarEstimado`, recalculada a cada dia a partir desses dois horários (sem recalcular a estimativa em si, que só muda por reconfirmação manual no Perfil).
- RN-08: Dentro da janela noturna, ao abrir um app bloqueado sem sessão nem cooldown ativos (RN-01 da HU-04), a pausa de intenção usa o dobro do valor de `SEQUENCIA_PAUSA_INTENCAO_SEG_V2` na posição atual da sessão do dia, com teto de 120 segundos.
- RN-09: Dentro da janela noturna, o texto padrão da pausa de intenção ("O que você vai fazer agora?") é substituído por uma mensagem do banco de tema `noturno`, escolhida em rotação sequencial sem repetir a mesma mensagem duas vezes seguidas para a mesma pessoa.
- RN-10: Com `rotina.alternativaNoturna` preenchido, a pausa de intenção noturna (RN-09) mostra um botão secundário adicional com o texto da alternativa (ex.: "Ler um pouco em vez disso"), que fecha a interceptação sem liberar a sessão. Sem alternativa cadastrada, esse botão não aparece.
- RN-11: Fora da janela noturna, a pausa de intenção segue exatamente como na HU-04 (sequência normal, texto padrão), mesmo com `rotina.confirmadoEm` preenchido.
- RN-12: Editar manualmente `rotina.dormirEstimado` ou `rotina.acordarEstimado` no Perfil marca `rotina.modoManual` como verdadeiro. Com `rotina.modoManual` verdadeiro, a estimativa automática (RN-03) não roda mais; os horários só mudam por nova edição manual, até a pessoa usar a opção "Recalcular automaticamente" no Perfil, que limpa `rotina.modoManual` e permite uma nova estimativa.
- RN-13: Nenhum texto desta HU usa a palavra "proteção" (reservada ao streak) nem soa como cobrança; a janela noturna é comunicada como um padrão identificado, nunca como regra imposta.

## Critérios de aceitação
- CA-01 (feliz): Com 5 dias de dados de uso coletados e sem `rotina.confirmadoEm`, abrir o app mostra a tela de confirmação com o horário estimado de dormir.
- CA-02 (feliz): Confirmar a rotina estimada grava `rotina.confirmadoEm` e, na sequência, mostra a pergunta sobre a alternativa noturna.
- CA-03 (feliz): Responder a alternativa noturna grava `rotina.alternativaNoturna`; abrir um app bloqueado dentro da janela noturna depois disso mostra o botão com essa alternativa.
- CA-04 (feliz): Dentro da janela noturna, com a 2ª sessão do dia (20s de pausa fora da janela), a pausa de intenção exige 40 segundos e mostra uma mensagem do tema `noturno` em vez do texto padrão.
- CA-05 (feliz): Duas aberturas seguidas de app bloqueado dentro da janela noturna, no mesmo dia, mostram mensagens diferentes do banco `noturno`.
- CA-06 (exceção): Sem `rotina.confirmadoEm` preenchido, abrir um app bloqueado às 23h (sem janela noturna aplicável) mostra a pausa de intenção padrão da HU-04, sem fricção extra.
- CA-07 (exceção): Com menos de 5 dias de dados de uso coletados, a tela de confirmação de rotina não é mostrada.
- CA-08 (exceção): Editar manualmente o horário de dormir no Perfil marca `rotina.modoManual` como verdadeiro, e uma nova estimativa automática não sobrescreve esse horário enquanto o modo manual estiver ativo.

## Estados de tela
- Protótipo: docs/design/prototipo/rotina-noturna.html
- Estados:
  - normal: confirmação da rotina estimada, com o horário de dormir calculado e as opções "Confirmar" e "Ajustar horário" (RN-04)
  - carregando: pergunta única sobre a alternativa noturna, mostrada uma vez logo depois da confirmação (RN-06)
  - erro: pausa de intenção estendida dentro da janela noturna, com a mensagem contextual rotativa e o atalho da alternativa quando cadastrada (RN-08 a RN-10)

## Arquitetura e stack
- Referência: docs/arquitetura/arquitetura.md
- Não muda a stack. A extensão de `agregarUsoPorDia` (RN-01) e a estimativa de rotina (RN-03) são funções puras, testáveis com fixtures próprias, assim como o restante do `domain/` da HU-02. A checagem de janela noturna e o dobro da sequência de pausa (RN-07, RN-08) entram como extensão da mesma máquina de estados da HU-04 (`SaldoBloqueioMaquina.kt` / `domain/saldoBloqueio.ts`), reaproveitando as fixtures compartilhadas sempre que possível.

## Contratos
Não se aplica.

## Dados e LGPD
- Dados: `primeiroUsoDia` e `ultimoUsoAntesPausaLonga` (horário de uso do aparelho, derivados dos eventos já coletados na HU-02); horários estimados de dormir e acordar, horário confirmado e alternativa noturna de texto livre, derivados desses dois campos.
- Base legal: execução do serviço solicitado pelo titular (art. 7º, V, da LGPD) — ajuste de uma funcionalidade que a própria pessoa configurou (bloqueio de apps).
- Retenção: enquanto a conta existir; apagados na exclusão de conta junto com `users/{uid}`.

## Requisitos não funcionais
- Acessibilidade: a mensagem contextual noturna e o tempo de espera são lidos pelo leitor de tela como texto; rótulos em todos os campos.
- Copy: segue as regras do projeto — sem cobrança, sem exclamação, sem a palavra "proteção".
- Privacidade: a estimativa de rotina nunca é exibida ou comunicada fora da tela de confirmação e do Perfil (nenhuma notificação cita o horário estimado).

## Histórico de versões
| Data | Versão | O que mudou |
| --- | --- | --- |
| 2026-10-21 | 1 | Versão inicial. |
| 2026-10-21 | 2 | Amplia o escopo para incluir a extensão da coleta de uso da HU-02 (RN-01, RN-02): sem horário no dado existente, a RN-03 (estimativa, antiga RN-01) não tinha como rodar — proposta P-01, decisão de ampliar a HU-06 em vez de abrir HU nova. Demais regras renumeradas (RN-03 a RN-13); nenhum "Então" dos cenários CA-01 a CA-08 muda. |

## Dúvidas abertas
