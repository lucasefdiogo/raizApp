---
id: HU-02
titulo: Coleta do uso das redes sociais
status: aprovada
versao: 1
produto: rootora
dados_sensiveis: sim
tem_tela: sim
muda_contrato: nao
---

## Contexto
A revisão semanal e a calibragem do motor de liberação precisam de dados reais de uso: quanto tempo e quantas vezes a pessoa abre cada rede social. Esses dados precisam existir mesmo quando o Accessibility Service está desligado, que é justamente o período mais importante de medir. Esta HU coleta e grava esse uso, sem nenhuma tela de visualização ainda.

## Escopo
- Módulo nativo Kotlin que lê o `UsageStatsManager` e devolve, por dia e por pacote, o tempo em primeiro plano e o número de aberturas dos apps da lista curada (HU-01).
- Declaração da permissão `PACKAGE_USAGE_STATS` no manifesto.
- Tela de divulgação do acesso de uso (`DivulgacaoAcessoUsoScreen`), no padrão da `DivulgacaoAcessibilidadeScreen`, com gravação do consentimento.
- Entrada para essa tela na `BloqueioAppsScreen`, visível enquanto o acesso de uso estiver desligado.
- Gravação agregada em `dailyLogs/{data}.usoApps`, a cada abertura do app, recalculando os últimos 7 dias.
- Atualização de `docs/arquitetura/arquitetura.md` para citar o módulo nativo de uso e a permissão `PACKAGE_USAGE_STATS`.

## Fora de escopo
- Qualquer tela que mostre os dados coletados (revisão semanal e desafios).
- Coleta em segundo plano (WorkManager ou similar).
- Aviso de proteção desligada (HU-03).
- Mudanças no motor de liberação e no saldo de blocos.
- Apps fora da lista curada.
- Atualização do texto da política de privacidade e do formulário de Segurança dos Dados da Play (pendência fora do código).

## Regras de negócio
- RN-01: A fonte única dos dados é o `UsageStatsManager` (eventos de app indo e saindo do primeiro plano). O Accessibility Service não participa da coleta.
- RN-02: São medidos todos os pacotes da lista curada instalados, marcados ou não na regra de bloqueio. Pacotes fora da lista nunca são gravados.
- RN-03: Para cada dia (meia-noite a meia-noite no fuso do aparelho) e pacote, são calculados `segundos` (tempo total em primeiro plano) e `aberturas` (quantas vezes o app entrou em primeiro plano vindo de outro app ou da tela inicial; trocar de tela dentro do mesmo app não conta).
- RN-04: O resultado é gravado em `dailyLogs/{YYYY-MM-DD}.usoApps.{pacote}` como `{ segundos: number, aberturas: number }`, substituindo o valor anterior daquele pacote naquele dia (nunca somando). Rodar a coleta várias vezes produz o mesmo resultado.
- RN-05: A coleta roda a cada vez que o app vem para o primeiro plano e logo após o acesso de uso ser concedido. Cada execução recalcula os últimos 7 dias, incluindo hoje, limitados ao histórico que o Android mantiver.
- RN-06: A coleta só roda com o acesso de uso concedido no sistema e `users/{uid}.consentimentoAcessoUso` gravado. Sem isso, nada é coletado nem gravado, sem mensagem de erro, e o bloqueio de apps continua funcionando normalmente.
- RN-07: Tocar em "Permitir acesso de uso" grava `users/{uid}.consentimentoAcessoUso` com a data do dia (YYYY-MM-DD) e abre a tela de acesso de uso das configurações do Android. "Agora não" volta sem gravar nada.
- RN-08: Gravar `usoApps` num dia nunca altera `tarefas`, `statusDia`, `escudoUsado` nem os demais campos do `dailyLog`. Um `dailyLog` que passa a existir só por causa de `usoApps` não muda o streak nem o status do dia no Progresso: o resultado é o mesmo de quando esse documento não existia.
- RN-09: A exclusão de conta já apaga `dailyLogs`; `usoApps` vai junto, sem mudança no fluxo de exclusão.
- RN-10: Textos da tela de divulgação:
  - Título: "Medir seu tempo nas redes"
  - Corpo: "Para mostrar quanto tempo você passa nas redes sociais, o Rootora usa o acesso de uso do Android. Medimos só os apps da lista de redes sociais: tempo de uso e quantas vezes cada um foi aberto. Os dados ficam na sua conta e são apagados se você excluir a conta."
  - Botão primário: "Permitir acesso de uso"
  - Botão secundário: "Agora não"
  - Texto ao voltar sem conceder: "Acesso de uso desligado. O bloqueio continua funcionando, só sem medir o tempo."
  - Entrada na `BloqueioAppsScreen`: "Medir tempo nas redes" (abre a tela de divulgação)

## Critérios de aceitação
- CA-01 (feliz): Com o acesso de uso concedido e consentimento gravado, se o Instagram ficou 20 minutos em primeiro plano em 3 aberturas hoje, a coleta grava `dailyLogs/{hoje}.usoApps["com.instagram.android"]` = `{ segundos: 1200, aberturas: 3 }`.
- CA-02 (feliz): Uso de um app fora da lista curada (ex.: Chrome) não aparece em `usoApps`.
- CA-03 (feliz): Rodar a coleta duas vezes seguidas no mesmo dia, sem uso novo, deixa `usoApps` com os mesmos valores.
- CA-04 (feliz): Se o app não foi aberto ontem, a coleta feita hoje preenche também `dailyLogs/{ontem}.usoApps` com o uso de ontem.
- CA-05 (feliz): Tocar em "Permitir acesso de uso" grava `consentimentoAcessoUso` com a data de hoje e abre as configurações de acesso de uso do Android.
- CA-06 (exceção): Sem o acesso de uso concedido, nenhuma coleta grava `usoApps`, e a `BloqueioAppsScreen` mostra a entrada "Medir tempo nas redes".
- CA-07 (exceção): Ao voltar das configurações sem conceder o acesso, a tela de divulgação mostra "Acesso de uso desligado. O bloqueio continua funcionando, só sem medir o tempo."
- CA-08 (exceção): Um dia passado sem `dailyLog` que recebe só `usoApps` mantém o mesmo streak e o mesmo status no Progresso que teria sem esse documento.

## Estados de tela
- Protótipo: docs/design/prototipo/divulgacao-acesso-uso.html
- Estados:
  - normal: explicação do acesso de uso, com os botões "Permitir acesso de uso" e "Agora não"
  - sem-permissao: a pessoa voltou das configurações sem conceder; mostra o aviso e mantém o botão para tentar de novo

## Arquitetura e stack
- Referência: docs/arquitetura/arquitetura.md
- ADR: docs/adr/0001-coleta-uso-usagestatsmanager.md
- Regra de agregação (eventos → `segundos`/`aberturas` por dia) vive como função pura testada. Se ela ficar no Kotlin, o teste é JUnit, rodado com `cd android && ./gradlew :app:testDebugUnitTest` e registrado no progress.md (o Gradle não roda no CI).

## Contratos
Não se aplica.

## Dados e LGPD
- Dados: tempo em primeiro plano (segundos) e número de aberturas por dia de cada app da lista curada de redes sociais; data do consentimento (`consentimentoAcessoUso`).
- Base legal: consentimento (art. 7º, I, da LGPD), dado na tela de divulgação antes de conceder o acesso de uso.
- Retenção: enquanto a conta existir; apagados na exclusão de conta junto com `dailyLogs`.

## Requisitos não funcionais
- Acessibilidade: botões com rótulo; o texto da divulgação lido por inteiro pelo leitor de tela.
- Desempenho: a coleta não bloqueia a abertura do app (roda depois da primeira tela aparecer).
- Escrita no Firestore: no máximo 1 escrita por dia coletado por execução, com `merge`.
- Copy: segue as regras do projeto (verbo no início, sem exclamação, sem cobrança).

## Dúvidas abertas
