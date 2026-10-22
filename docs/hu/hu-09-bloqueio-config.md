# HU-09 — [Bloqueio] Configuração legível: o que vale hoje, o que muda amanhã

> Facelift 2026 · 3ª na ordem (HU-07 → HU-10 → **HU-09** → HU-11 → HU-08)
> Protótipo: `docs/hu/hu-09-bloqueio-config.html` (telas 09.1 a 09.4) · visão geral do facelift em `docs/hu/rootora-facelift-visao-geral.html`
> Fontes: `navegacao-componentes.md` (BloqueioAppsScreen, AvisoAlteracaoPendenteScreen, PerfilScreen, AppListItem, SeletorDiasSemana), `docs/projeto/spec.md` (bloqueio de apps, motor de sessões, pré-compromisso), `docs/projeto/design-system.md`, `roadmap-e-status.md` §8 e §17
> Depende da **HU-10** (`RotinaPerfilScreen` precisa existir para o link "Editar" da rotina)

---

## 1. Título

**[Bloqueio] Configuração legível: o que vale hoje, o que muda amanhã**

## 2. Cartão da HU

* **Como um(a):** pessoa que configurou o bloqueio de apps
* **Eu quero:** entender de relance o que está valendo hoje, o que muda amanhã e como funcionam as sessões
* **Para que eu possa:** não ser pega de surpresa pela interceptação nem pensar em desinstalar o app

## 3. Protótipo / UX UI

Arquivo `docs/hu/hu-09-bloqueio-config.html`:

| Tela | Estado | O que muda |
|---|---|---|
| 09.1 | Bloqueio configurado | `BloqueioAppsScreen` em seções com eyebrow: Status → Quando → Apps → Sessões → Rotina noturna → Resumo + Salvar |
| 09.2 | Com alteração pendente | Banner "VALE A PARTIR DE AMANHÃ" no topo, só com borda |
| 09.3 | Aviso antes de salvar | `AvisoAlteracaoPendenteScreen` com a linha nova sobre desligar o serviço agora |
| 09.4 | Perfil | Linhas "Bloqueio de apps" e "Rotina noturna" com o estado atual em uma linha; porquê em destaque |

Regras visuais (design system): fundo Casca, superfícies Areia, eyebrows em Space Mono, sem sombra nem gradiente. **Único Cobre da `BloqueioAppsScreen`: o botão "Salvar".** No Perfil, o único Cobre é o toggle ligado do lembrete (padrão do tema).

**Decisões tomadas em 22/out (antes pendentes):**
1. A edição da rotina noturna é **uma rota só**, a `RotinaPerfilScreen` (HU-10), no `PerfilStack`. Tem entrada própria no Perfil ("Rotina noturna") e, no Bloqueio, aparece como resumo com o link "Editar". Isso resolve a contradição entre `navegacao-componentes.md` e `regras-de-negocio.md`.
2. Os dias selecionados (`SeletorDiasSemana`) passam a Terra Escura, e a caixa de seleção do app (`AppListItem`) passa a Musgo. Antes, os dois eram Cobre.

Arquivos impactados (estimativa, confirmar no código):
- `src/screens/BloqueioAppsScreen.tsx`: seções, banner de pendência, seções Sessões e Rotina noturna
- `src/components/bloqueio/SecaoConfig.tsx` (novo, burro): eyebrow + link opcional à direita + conteúdo
- `src/components/bloqueio/SessoesInfoSheet.tsx` (novo, burro): sheet "Como funciona"
- `src/components/bloqueio/SeletorDiasSemana.tsx`: cor de selecionado
- `src/components/bloqueio/AppListItem.tsx`: cor da caixa marcada
- `src/screens/AvisoAlteracaoPendenteScreen.tsx` (ou componente equivalente): título e linha nova
- `src/screens/PerfilScreen.tsx`: linhas com estado, entrada "Rotina noturna", porquê em citação
- `src/domain/appBlock.ts`: nova função pura `resumoCurtoBloqueio` (RN10); `resumoRegrasBloqueio` continua igual
- `src/domain/rotina.ts` (ou onde a HU-10 colocar a lógica de rotina): `resumoRotina` (RN11)
- Documentação na mesma branch: `docs/projeto/design-system.md` (cores de `SeletorDiasSemana`, `AppListItem`, "Excluir conta"), `navegacao-componentes.md` e `regras-de-negocio.md` (rotina numa rota só)

Sem mudança no Firestore, no motor de sessões, na regra de pré-compromisso nem no lado nativo.

## 4. Regras de Negócio

### BloqueioAppsScreen

* **RN01 — Estrutura:** a tela é organizada em seções, cada uma com eyebrow em Space Mono, nesta ordem: Status do serviço → QUANDO → APPS → SESSÕES → ROTINA NOTURNA → MEDIR TEMPO NAS REDES (só enquanto o acesso de uso estiver desligado) → resumo em texto + botão "Salvar" no fim.
* **RN02 — Status do serviço:** card em Areia com selo "ATIVO" (ponto Musgo) ou "DESATIVADO" (ponto Terra Suave), de acordo com `useAccessibilityPermission`. O link "Saiba o que é" (ícone `Info` + texto sublinhado Terra Suave) aparece sempre. Ativo: linha "O serviço de acessibilidade está interceptando os apps abaixo.". Desativado: linha "Sem ele, o Rootora não consegue interceptar os apps abaixo." e o botão "Ativar" (`SecondaryButton`). Os dois levam à `DivulgacaoAcessibilidadeScreen`, como hoje.
* **RN03 — Quando:** os seletores de início e fim (`DateTimePicker`) e os 7 dias (`SeletorDiasSemana`). A validação atual (fim depois do início, sem atravessar a meia-noite) não muda. Dia selecionado: fundo Terra Escura e letra Casca. Não selecionado: borda Terra Suave.
* **RN04 — Apps:** busca por nome e lista de `AppListItem`, restrita à lista curada de redes sociais instaladas. Caixa marcada: fundo Musgo com ✓ em Casca. Continuam valendo a pré-marcação da 1ª configuração (todos menos o YouTube), a dica do YouTube "Usa para estudar? Pode deixar livre." e o estado vazio "Nenhuma rede social encontrada neste aparelho.".
* **RN05 — Sessões (só leitura):** card com 3 números: "{duracaoBlocoMin} min" DE USO, "{cooldownMin} min" DE PAUSA e "{ACESSOS_RAPIDOS_DIARIOS}x" ACESSO RÁPIDO, lendo `regrasBloqueio` vigente com os padrões (15, 45, 3). Com `blocosDiarios` numérico, aparece a linha "Até {n} sessões por dia.". Não há edição nesta tela.
* **RN06 — Como funciona:** o link "Como funciona", à direita do eyebrow SESSÕES, abre um bottom sheet com o texto: "Antes de cada sessão, uma pausa curta pergunta o que você vai fazer. Cada sessão dá {duracaoBlocoMin} minutos de uso, contados só com a rede aberta. Depois vem uma pausa de {cooldownMin} minutos. Durante a pausa, o acesso rápido libera 2 minutos, até {ACESSOS_RAPIDOS_DIARIOS} vezes por dia." e o botão "Entendi" (`PrimaryButton`).
* **RN07 — Rotina noturna (resumo):** card com ícone de lua e o texto de `resumoRotina` (RN11), e o link "Editar", à direita do eyebrow, que abre a `RotinaPerfilScreen` (HU-10). Com rotina confirmada, aparece também a linha "Pausa maior entre {dormir − 30 min} e {acordar}". A tela não edita a rotina; ela só existe na `RotinaPerfilScreen`.
* **RN08 — Alteração pendente:** com `regrasBloqueioPendentes`, um banner no topo da tela (só borda Terra Suave, sem fundo) mostra o eyebrow "VALE A PARTIR DE AMANHÃ", o `resumoCurtoBloqueio` da regra pendente e o link "Cancelar alteração", que apaga a pendência na hora. A edição parte da regra pendente, como hoje.
* **RN09 — Salvar e pré-compromisso:** a regra não muda. Na 1ª configuração, "Salvar" grava direto. Em qualquer alteração depois, "Salvar" mostra a `AvisoAlteracaoPendenteScreen` antes de gravar. Confirmada, a alteração vira pendente e aparece o toast atual "Anotado. A nova regra começa amanhã.".

### Resumos (domain)

* **RN10 — `resumoCurtoBloqueio(regras)`:** função pura que devolve "{n} apps · {dias} · {início}–{fim}". Dias: intervalo contínuo vira "seg a sex"; todos os dias, "todos os dias"; dias soltos, separados por vírgula ("seg, qua, sex"). Um app: "1 app". O `resumoRegrasBloqueio` (texto longo do rodapé) continua igual.
* **RN11 — `resumoRotina(rotina, diasComDados, acessoUso)`:** função pura que devolve, em ordem de prioridade:
  - rotina confirmada: "Dormir {dormir} · Acordar {acordar}" (forma longa, no Bloqueio) ou "{dormir} – {acordar}" (forma curta, no Perfil);
  - sem acesso de uso: "Precisa medir o tempo nas redes";
  - menos de 5 dias com dados: "Aprendendo seu horário · {n} de 5 dias";
  - 5 ou mais dias, ainda sem confirmação: "Pronta para confirmar".

### AvisoAlteracaoPendenteScreen

* **RN12 — Aviso:** título "Antes de salvar". Mantém o texto atual de reconhecimento do momento e os dois resumos ("HOJE CONTINUA" / "A PARTIR DE AMANHÃ", agora com o `resumoCurtoBloqueio`). Acrescenta, acima dos botões, uma linha com ícone `Info`: "Precisa parar agora? Dá para desligar o serviço nas configurações de acessibilidade do Android, a qualquer momento.". É só texto, sem link nem botão (não incentiva desligar, só não esconde). Os botões continuam: "Entendi, confirmar" (`PrimaryButton`) e "Voltar e revisar" (`SecondaryButton`).

### PerfilScreen

* **RN13 — Ordem:** "Seu porquê" → grupo de navegação (Bloqueio de apps, Rotina noturna, Lembrete diário) → grupo Sobre (Ver tutorial novamente, Política de Privacidade, Termos de Uso) → "Sair" → "Excluir conta" → link de debug (condicional, como hoje).
* **RN14 — Seu porquê:** exibido como citação (Zilla itálico, barra Musgo à esquerda) com o link "Editar". Tocar em "Editar" mostra o campo e o botão "Salvar", como hoje. Sem porquê cadastrado: campo vazio direto, como hoje.
* **RN15 — Linha "Bloqueio de apps":** ícone de cadeado, título e o estado em uma linha: serviço ativo com regras → "Ativo · {resumoCurtoBloqueio vigente}"; serviço desativado com regras → "Desativado"; sem `regrasBloqueio` → "Não configurado". Toque abre a `BloqueioAppsScreen`.
* **RN16 — Linha "Rotina noturna" (nova):** ícone de lua, título e a forma curta de `resumoRotina`. Toque abre a `RotinaPerfilScreen` (HU-10).
* **RN17 — Linha "Lembrete diário":** ícone de sino, título, horário como subtítulo e toggle à direita. Tocar no texto abre o `DateTimePicker`; o toggle liga e desliga, como hoje.
* **RN18 — Saída e conta:** "Sair" vira `SecondaryButton`; "Excluir conta" vira link de texto neutro centralizado (Terra Suave, sublinhado), com a mesma ação de hoje (abre o `ConfirmDeleteAccountModal`). Nenhum dos dois usa vermelho.

### Geral

* **RN19 — Cores:** em nenhuma tela desta HU há mais de um Cobre. Dias selecionados e caixas de app nunca usam Cobre.
* **RN20 — Documentação:** na mesma branch, atualizar `docs/projeto/design-system.md` (cores de `SeletorDiasSemana` e `AppListItem`, "Excluir conta" como link), `navegacao-componentes.md` e `regras-de-negocio.md` (rotina numa rota só, com entrada no Perfil e resumo no Bloqueio).
* **RN21 — Tom:** sem ponto de exclamação; nenhum texto desta HU usa a palavra "proteção".

## 5. Critérios de Aceite (BDD/Gherkin)

```gherkin
Cenário 1: Seções na ordem certa
  Dado que já configurei o bloqueio e o serviço está ativo
  Quando abro Perfil → Bloqueio de apps
  Então vejo, nesta ordem, o status, "QUANDO", "APPS", "SESSÕES", "ROTINA NOTURNA" e o resumo com "Salvar"

Cenário 2: Status ativo
  Dado que o serviço de acessibilidade está ativo
  Quando abro Bloqueio de apps
  Então vejo o selo "ATIVO"
  E vejo "Saiba o que é"
  E não vejo o botão "Ativar"

Cenário 3: Status desativado
  Dado que o serviço de acessibilidade está desativado
  Quando abro Bloqueio de apps
  Então vejo o selo "DESATIVADO"
  E vejo "Sem ele, o Rootora não consegue interceptar os apps abaixo."
  E vejo o botão "Ativar" e o link "Saiba o que é"

Cenário 4: Único Cobre é o Salvar
  Dado que estou em Bloqueio de apps com 5 dias e 4 apps selecionados
  Quando a tela é renderizada
  Então os dias selecionados usam Terra Escura
  E as caixas marcadas usam Musgo
  E o único elemento em Cobre é o botão "Salvar"

Cenário 5: Sessões com os valores padrão
  Dado que minha regra de bloqueio não define duracaoBlocoMin nem cooldownMin
  Quando vejo a seção "SESSÕES"
  Então vejo "15 min" de uso, "45 min" de pausa e "3x" acesso rápido
  E não vejo nenhum campo de edição

Cenário 6: Como funciona
  Dado que estou na seção "SESSÕES"
  Quando toco em "Como funciona"
  Então abre uma sheet explicando a pausa curta, a sessão de 15 minutos, a pausa de 45 minutos e o acesso rápido
  E toco em "Entendi" para fechar

Cenário 7: Rotina ainda aprendendo
  Dado que concedi o acesso de uso e tenho 3 dias com dados
  Quando vejo a seção "ROTINA NOTURNA"
  Então leio "Aprendendo seu horário · 3 de 5 dias"

Cenário 8: Rotina confirmada leva à edição
  Dado que confirmei a rotina com dormir 23:30 e acordar 07:00
  Quando toco em "Editar" na seção "ROTINA NOTURNA"
  Então abre a tela Rotina noturna
  E antes de tocar eu via "Dormir 23:30 · Acordar 07:00" e "Pausa maior entre 23:00 e 07:00"

Cenário 9: Primeira configuração grava direto
  Dado que ainda não existe regra de bloqueio
  Quando escolho os apps e o horário e toco em "Salvar"
  Então a regra vale na hora
  E não vejo a tela "Antes de salvar"

Cenário 10: Alteração passa pelo aviso honesto
  Dado que já existe uma regra vigente com 5 apps, seg a sex, 09:00–18:00
  Quando desmarco o TikTok, mudo o fim para 20:00 e toco em "Salvar"
  Então vejo "Antes de salvar"
  E vejo "HOJE CONTINUA" com "5 apps · seg a sex · 09:00–18:00"
  E vejo "A PARTIR DE AMANHÃ" com "4 apps · seg a sex · 09:00–20:00"
  E vejo "Precisa parar agora? Dá para desligar o serviço nas configurações de acessibilidade do Android, a qualquer momento."

Cenário 11: Confirmar cria a pendência
  Dado que estou na tela "Antes de salvar"
  Quando toco em "Entendi, confirmar"
  Então vejo o toast "Anotado. A nova regra começa amanhã."
  E vejo no topo o banner "VALE A PARTIR DE AMANHÃ" com "4 apps · seg a sex · 09:00–20:00"

Cenário 12: Voltar e revisar não grava
  Dado que estou na tela "Antes de salvar"
  Quando toco em "Voltar e revisar"
  Então volto para a edição com minhas mudanças
  E nenhuma pendência é criada

Cenário 13: Cancelar a pendência
  Dado que existe uma alteração pendente
  Quando toco em "Cancelar alteração"
  Então o banner some
  E a tela volta a mostrar a regra vigente

Cenário 14: Estado do bloqueio no Perfil
  Dado que o serviço está ativo e a regra vigente é 5 apps, seg a sex, 09:00–18:00
  Quando abro o Perfil
  Então a linha "Bloqueio de apps" mostra "Ativo · 5 apps · seg a sex · 09:00–18:00"

Cenário 15: Bloqueio nunca configurado no Perfil
  Dado que nunca configurei o bloqueio
  Quando abro o Perfil
  Então a linha "Bloqueio de apps" mostra "Não configurado"

Cenário 16: Rotina no Perfil
  Dado que confirmei a rotina com dormir 23:30 e acordar 07:00
  Quando abro o Perfil
  Então vejo a linha "Rotina noturna" com "23:30 – 07:00"
  E ao tocar nela abre a tela Rotina noturna

Cenário 17: Rotina sem acesso de uso no Perfil
  Dado que nunca concedi o acesso de uso
  Quando abro o Perfil
  Então a linha "Rotina noturna" mostra "Precisa medir o tempo nas redes"

Cenário 18: Excluir conta continua neutro
  Dado que estou no Perfil
  Quando toco no link "Excluir conta"
  Então abre o modal de confirmação de exclusão
  E nenhum elemento da tela usa vermelho
```

## 6. Testes sugeridos (Jest + @testing-library/react-native)

Seguindo o CLAUDE.md: `describe('HU-09 · Configuração legível do bloqueio', ...)` e `it('Cenário N: ...')`.

- `domain/appBlock.ts` → `resumoCurtoBloqueio` (prioridade): intervalo contínuo, todos os dias, dias soltos, 1 app vs. N apps
- `domain` → `resumoRotina`: as 4 saídas e as formas longa e curta
- `BloqueioAppsScreen`: ordem das seções, status ativo e desativado, seção Sessões com padrões e com valores definidos, linha de `blocosDiarios`, banner de pendência, aviso só fora da 1ª configuração
- `SeletorDiasSemana` e `AppListItem`: cor de selecionado vinda de `theme/` (nenhum hex no componente)
- `PerfilScreen`: textos das linhas de Bloqueio e Rotina nos estados possíveis; "Excluir conta" abre o modal
- Atenção (CLAUDE.md/navegacao-componentes): `AppListItem` usa checkbox customizado, não `Switch` nativo, porque o `Switch` quebra nos testes Jest no mesmo arquivo de um `LoadingIndicator`

## 7. Pendências

- Nenhuma decisão de produto em aberto: as duas pendências desta HU foram decididas em 22/out (ver seção 3).
- A edição dos valores de sessão (`duracaoBlocoMin`, `cooldownMin`, `blocosDiarios`) segue sem tela. Esta HU só mostra esses valores.
