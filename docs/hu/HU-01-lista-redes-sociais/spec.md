---
id: HU-01
titulo: Lista de apps bloqueáveis só com redes sociais
status: aprovada
versao: 1
produto: rootora
dados_sensiveis: nao
tem_tela: sim
muda_contrato: nao
---

## Contexto
O foco do app passa a ser o uso sem limite de redes sociais. Hoje a tela "Bloqueio de apps" lista todos os apps instalados (via `<queries>` com `MAIN`/`LAUNCHER`), o que dilui esse foco e permite bloquear apps que não são o problema. Esta HU restringe a lista a uma seleção curada de redes sociais.

## Escopo
- `BloqueioAppsScreen` passa a listar só os apps da lista curada que estão instalados no aparelho.
- O `<queries>` do `AndroidManifest.xml` troca a consulta `MAIN`/`LAUNCHER` pela declaração explícita dos pacotes da lista curada.
- Pré-marcação dos apps na primeira configuração.
- Dica de texto no item do YouTube.
- Estado vazio quando nenhum app da lista está instalado.
- Limpeza, na primeira abertura após a atualização, de apps fora da lista em `regrasBloqueio.apps` e `regrasBloqueioPendentes.apps`.
- Configuração do reporter `jest-junit` no Jest (`outputDirectory: 'reports/junit'`), para o `npm test` gerar o relatório JUnit XML.

## Fora de escopo
- Saldo de blocos, sessões, pausas, acesso rápido e qualquer mudança no motor de liberação.
- Coleta de dados de uso e revisão semanal.
- Bloqueio só dos Shorts dentro do YouTube.
- Categoria "social" do Android (`ApplicationInfo.category`) como fonte complementar da lista.
- Pergunta de foco do onboarding (`focoProcrastinacao`).
- Textos da ficha da Play Store.
- Janelas de horário da regra de bloqueio (continuam como estão).

## Regras de negócio
- RN-01: A lista curada é uma constante única em `src/domain/` com estes pacotes: Instagram (`com.instagram.android`), TikTok (`com.zhiliaoapp.musically`, `com.ss.android.ugc.trill`), Kwai (`com.kwai.video`), Facebook (`com.facebook.katana`, `com.facebook.lite`), X (`com.twitter.android`), Threads (`com.instagram.barcelona`), Reddit (`com.reddit.frontpage`), Pinterest (`com.pinterest`), Snapchat (`com.snapchat.android`) e YouTube (`com.google.android.youtube`). O `<queries>` do manifesto declara exatamente esses pacotes.
- RN-02: A tela mostra só os pacotes da lista curada instalados no aparelho, cada um como um item com o nome e o ícone informados pelo Android. Apps fora da lista nunca aparecem.
- RN-03: Com `regrasBloqueio` ausente (primeira configuração), todos os apps listados vêm marcados, exceto o YouTube (`com.google.android.youtube`), que vem desmarcado. Com `regrasBloqueio` existente, valem as marcações salvas, sem pré-marcação.
- RN-04: O item do YouTube exibe a dica "Usa para estudar? Pode deixar livre.", marcado ou não.
- RN-05: Sem nenhum app da lista instalado, a tela mostra o estado vazio com o texto "Nenhuma rede social encontrada neste aparelho." e não oferece seleção de apps.
- RN-06: Na primeira abertura do app após a atualização, todo pacote fora da lista curada é removido de `regrasBloqueio.apps` e de `regrasBloqueioPendentes.apps`, gravando direto na regra vigente (e na pendente, se houver), sem criar nem adiar pendência. A cópia da regra usada pelo Accessibility Service é atualizada junto, e esses pacotes deixam de ser interceptados.
- RN-07: A limpeza da RN-06 é idempotente: rodar de novo sobre uma regra já limpa não grava nada.

## Critérios de aceitação
- CA-01 (feliz): Na primeira configuração, com Instagram, TikTok e YouTube instalados, a lista mostra os três; Instagram e TikTok vêm marcados e o YouTube vem desmarcado, com a dica "Usa para estudar? Pode deixar livre."
- CA-02 (feliz): Apps instalados fora da lista curada (ex.: WhatsApp, Chrome) não aparecem na lista.
- CA-03 (feliz): Quem já tem `regrasBloqueio` salva vê exatamente as marcações salvas, sem pré-marcação.
- CA-04 (exceção): Sem nenhum app da lista curada instalado, a tela mostra "Nenhuma rede social encontrada neste aparelho." e nenhum item de app.
- CA-05 (exceção): Uma regra salva com um app fora da lista curada perde esse app na primeira abertura após a atualização, sem criar pendência, e o app deixa de ser interceptado.

## Estados de tela
- Protótipo: docs/design/prototipo/bloqueio-apps.html
- Estados:
  - normal: lista dos apps da lista curada instalados, com checkbox, e dica no YouTube
  - carregando: enquanto resolve quais apps da lista estão instalados (ícones e nomes)
  - vazio: nenhum app da lista curada instalado neste aparelho

## Arquitetura e stack
- Referência: docs/arquitetura/arquitetura.md
- Não muda a stack. A lista curada vive em `src/domain/` (função pura, com teste); a limpeza da RN-06 segue o padrão de `domain/appBlock.ts` para a decisão e `hooks/`/`services/` para a gravação.

## Contratos
Não se aplica.

## Dados e LGPD
Não se aplica.

## Requisitos não funcionais
- Acessibilidade: cada item da lista tem rótulo com o nome do app e o estado (marcado/desmarcado); a dica do YouTube é lida junto com o item.
- Política da Play Store: sem `QUERY_ALL_PACKAGES`; a visibilidade de pacotes vem só do `<queries>` com a lista curada.
- Testes: `npm test` gera o relatório JUnit XML em `reports/junit/`.

## Dúvidas abertas
