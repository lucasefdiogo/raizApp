---
id: HU-05
titulo: Acesso rápido e saída de emergência
status: aprovada
versao: 1
produto: rootora
dados_sensiveis: nao
tem_tela: sim
muda_contrato: nao
---

## Contexto
A HU-04 troca o motor de liberação por sessões com cooldown de 45 minutos, mas isso por si só recria o problema original: um cooldown sem nenhuma saída intermediária leva a desativar o Accessibility Service para acessar algo rápido. Esta HU acrescenta duas válvulas de escape, sempre mais baratas do que desativar o serviço: o acesso rápido, limitado e espaçado, e a saída de emergência, sem limite, mas com fricção. As duas precisam entrar na mesma versão que a HU-04.

## Escopo
- Acesso rápido: liberação de 2 minutos, com espera de 5 segundos antes de abrir, até 3 vezes por dia, com intervalo crescente entre usos (15 → 30 → 60 minutos).
- O acesso rápido fica disponível também durante o cooldown de uma sessão (RN da HU-04), que é justamente quando falta uma saída.
- Saída de emergência: respiração de 60 segundos que libera 2 minutos, sem limite de usos por dia, oferecida só quando não há sessão nem acesso rápido disponíveis.
- Timer visível na tela de cooldown mostrando se há acesso rápido disponível agora ou quando ele libera.
- `resumoBloqueio` ganha `acessosRapidos` (contador) e `emergencias` (contador).
- Atualização de `docs/arquitetura/arquitetura.md` se necessário (não deve mudar a stack).

## Fora de escopo
- Qualquer mudança na sessão de 15 minutos, no cooldown de 45 minutos ou na pausa de intenção (HU-04).
- Limite diário configurável de acessos rápidos ou emergências pela tela (fica fixo no código por agora).
- Revisão semanal e desafios baseados nesses contadores.
- Compromisso social e qualquer aviso fora desta tela.

## Regras de negócio
- RN-01: O acesso rápido libera 2 minutos de uso, contados globalmente e só em primeiro plano, igual à sessão normal. Antes de liberar, há uma espera de 5 segundos (sem campo de texto, sem pausa de intenção).
- RN-02: O acesso rápido tem uma cota de 3 usos por dia (`ACESSOS_RAPIDOS_DIARIOS`, fixo no código). A cota zera à meia-noite, junto com o resto do saldo.
- RN-03: Entre dois acessos rápidos, o intervalo mínimo é de 15 minutos após o 1º uso do dia, 30 minutos após o 2º, e 60 minutos após o 3º (não há 4º uso, a cota já acabou). O intervalo é contado a partir do fim do acesso rápido anterior.
- RN-04: O acesso rápido pode ser usado durante o cooldown de uma sessão normal (RN-05 da HU-04), desde que a cota e o intervalo da RN-02/RN-03 permitam. Usar o acesso rápido não encurta nem cancela o cooldown da sessão.
- RN-05: Com a cota de acesso rápido disponível e o intervalo já passado, a tela de interceptação (seja em cooldown de sessão, seja em qualquer outro momento de bloqueio) mostra a opção "Acesso rápido (2 min)". Sem cota disponível ou dentro do intervalo, a tela mostra quando o próximo acesso rápido libera ("próximo acesso rápido em X min") em vez do botão.
- RN-06: A saída de emergência aparece só quando não há sessão ativa, nem cooldown liberável (RN-04 da HU-04), nem acesso rápido disponível no momento (cota ou intervalo impedindo). Ela nunca substitui uma opção melhor já disponível.
- RN-07: Tocar na saída de emergência mostra uma respiração guiada de 60 segundos, sem opção de pular. Ao terminar, libera 2 minutos de uso, contados como o acesso rápido (globalmente, só em primeiro plano).
- RN-08: A saída de emergência não tem limite de usos por dia e não consome a cota do acesso rápido. Cada uso é registrado.
- RN-09: `registrarResumoBloqueioNoDia` grava `acessosRapidos` (incrementado a cada uso do RN-01) e `emergencias` (incrementado a cada uso do RN-07), além dos campos já existentes (`sessoesUsadas`, `intencoes`).
- RN-10: Nenhum texto desta HU usa a palavra "proteção" (reservada ao streak) nem soa como punição; a indisponibilidade do acesso rápido é comunicada como tempo de espera, nunca como negativa.

## Critérios de aceitação
- CA-01 (feliz): Com a cota de acesso rápido disponível, tocar em "Acesso rápido (2 min)" espera 5 segundos e libera 2 minutos de uso.
- CA-02 (feliz): Usar o acesso rápido durante o cooldown de uma sessão não altera o tempo restante do cooldown da sessão.
- CA-03 (feliz): Depois do 1º acesso rápido do dia, a opção some e aparece "próximo acesso rápido em 15 min"; depois do 2º, aparece "em 30 min"; depois do 3º, a opção não volta a aparecer nesse dia.
- CA-04 (feliz): Com a cota de acesso rápido esgotada e sem sessão disponível, a tela mostra a saída de emergência.
- CA-05 (feliz): Completar a respiração de 60 segundos da emergência libera 2 minutos de uso, e o contador `emergencias` do dia aumenta em 1.
- CA-06 (exceção): Com acesso rápido disponível, a saída de emergência não é oferecida.
- CA-07 (exceção): Usar a emergência não consome nem altera a cota do acesso rápido do dia.

## Estados de tela
- Protótipo: docs/design/prototipo/acesso-rapido-emergencia.html
- Estados:
  - normal: tela de cooldown com o acesso rápido disponível (botão "Acesso rápido (2 min)")
  - carregando: respiração guiada da emergência em andamento
  - vazio: acesso rápido indisponível (cota ou intervalo), mostrando "próximo acesso rápido em X min" e a opção de emergência

## Arquitetura e stack
- Referência: docs/arquitetura/arquitetura.md
- Não muda a stack. A cota e os intervalos do acesso rápido são constantes em `src/domain/` (ou na máquina de estados nativa, se for onde a HU-04 deixou a lógica de cooldown), testadas por função pura. Se a lógica ficar em Kotlin, teste JUnit via `cd android && ./gradlew :app:testDebugUnitTest`, registrado no progress.md (não roda no CI).

## Contratos
Não se aplica.

## Dados e LGPD
Não se aplica.

## Requisitos não funcionais
- Acessibilidade: o tempo de espera do acesso rápido e da respiração é lido pelo leitor de tela como texto.
- Copy: segue as regras do projeto — a indisponibilidade do acesso rápido é "tempo de espera", nunca "negada" ou "bloqueada".

## Dúvidas abertas
