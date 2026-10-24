# HU-12 — [Bloqueio] Janela de horário opcional — "o dia todo" como primeira opção

> Facelift 2026 · melhoria sobre código já implementado (todas as HU-07 a HU-11 estão construídas)
> Protótipo: `docs/hu/hu-12-janela-dia-todo.html` (telas 12.1 e 12.2) · visão geral em `docs/hu/rootora-facelift-visao-geral.html`
> Fontes: `regras-de-negocio.md` §4 e §5, `09-ponte-fuga-tarefa-e-estou-travado.md` §8, `schema-firebase.md` §2 (`regrasBloqueio.janelas`)

---

## 1. Título

**[Bloqueio] Janela de horário opcional — "o dia todo" como primeira opção**

## 2. Cartão da HU

* **Como um(a):** pessoa que quer reduzir o uso geral das redes sociais, não só em um horário específico
* **Eu quero:** poder bloquear o dia inteiro, sem ser obrigada a configurar uma janela de início e fim
* **Para que eu possa:** ter a fricção da interceptação disponível a qualquer hora que eu tente abrir uma rede bloqueada

## 3. Protótipo / UX UI

Arquivo `docs/hu/hu-12-janela-dia-todo.html`:

| Tela | Estado | O que muda |
|---|---|---|
| 12.1 | "Quando" · O dia todo | Seletor segmentado no topo da seção; com "O dia todo", os campos de início/fim somem |
| 12.2 | "Quando" · Horário específico | Mesmo seletor, com a opção de horário aberto — comportamento igual ao que já existe hoje |

Hoje a `BloqueioAppsScreen` obriga a escolher início e fim (`regras-de-negocio.md` §4: "início, fim ... e dias da semana"). Essa HU não remove a janela — adiciona a opção de não ter uma, pra quem não procrastina só em horário fixo.

Arquivos impactados (confirmar no código):
- `src/screens/BloqueioAppsScreen.tsx`: novo seletor "O dia todo" / "Horário específico" acima dos campos de hora
- `src/domain/appBlock.ts`: `resumoCurtoBloqueio` (HU-09) passa a reconhecer `inicio: "00:00", fim: "23:59"` como "o dia todo" no texto, em vez de mostrar o intervalo
- Sem campo novo no Firestore — `regrasBloqueio.janelas` continua `{inicio, fim, diasSemana[]}`

## 4. Regras de Negócio

* **RN01 — Seletor:** novo seletor segmentado "O dia todo" / "Horário específico" no topo da seção "Quando", antes dos campos de início/fim.
* **RN02 — Sugestão na 1ª configuração:** sem `regrasBloqueio` existente, "O dia todo" vem pré-selecionado. Quem já tem `regrasBloqueio` configurado continua com o que tinha — esta HU não migra ninguém automaticamente.
* **RN03 — "O dia todo":** os campos de início/fim desaparecem; `janelas` é gravado como `[{inicio: "00:00", fim: "23:59", diasSemana}]` — mesmo formato de dado já usado, sem campo novo. Os dias da semana continuam configuráveis normalmente.
* **RN04 — "Horário específico":** comportamento inalterado — início, fim (precisa ser depois do início), dias da semana.
* **RN05 — Pré-compromisso:** trocar de uma opção pra outra é uma alteração como qualquer outra em `regrasBloqueio` — segue a regra única da seção 8 de `09-ponte-fuga-tarefa...md`: só vale a partir do dia seguinte se já havia `regrasBloqueio` vigente.
* **RN06 — Resumo em texto:** o resumo da própria tela e o resumo no Perfil (`resumoCurtoBloqueio`, HU-09) mostram "o dia todo" em vez do intervalo quando a janela for `00:00–23:59` — ex. "5 apps · seg a sex · o dia todo".
* **RN07 — Nativo:** `BloqueioPrefs.kt` não precisa de lógica nova — uma janela `00:00–23:59` já é avaliada como "sempre dentro" pela lógica existente de janela inclusiva/invertida.
* **RN08 — Tom:** a tela não indica qual opção é "melhor" nem usa a palavra "recomendado" — descreve o efeito de cada uma em uma linha e deixa a escolha com a pessoa.

## 5. Critérios de Aceite (BDD/Gherkin)

```gherkin
Cenário 1: Primeira configuração sugere "o dia todo"
  Dado que ainda não existe regrasBloqueio
  Quando abro a BloqueioAppsScreen pela primeira vez
  Então o seletor "O dia todo" já vem selecionado
  E não vejo os campos de início e fim

Cenário 2: Escolher "o dia todo" grava a janela correta
  Dado que estou configurando o bloqueio
  Quando seleciono "O dia todo" e toco "Salvar"
  Então regrasBloqueio.janelas grava inicio "00:00" e fim "23:59"

Cenário 3: Escolher "horário específico" mantém os campos de hora
  Dado que estou configurando o bloqueio
  Quando seleciono "Horário específico"
  Então vejo os campos de início e fim
  E a validação de fim depois do início continua valendo

Cenário 4: Trocar de opção com regra já vigente cria pendência
  Dado que já tenho regrasBloqueio vigente com horário específico
  Quando troco para "O dia todo" e toco "Salvar"
  Então vejo o aviso de pré-compromisso
  E a mudança só vale a partir de amanhã

Cenário 5: Resumo no Perfil mostra "o dia todo"
  Dado que minha janela vigente é 00:00–23:59
  Quando abro o Perfil
  Então a linha "Bloqueio de apps" mostra "... · o dia todo" em vez de um intervalo de hora

Cenário 6: Dias da semana continuam configuráveis
  Dado que selecionei "O dia todo"
  Quando desmarco o sábado e o domingo
  Então a regra vale só de segunda a sexta, o dia todo
```

## 6. Testes sugeridos

Seguindo o CLAUDE.md: `describe('HU-12 · Janela de horário opcional', ...)` e `it('Cenário N: ...')`.

- `domain/appBlock.ts`: gravação dos dois formatos de janela, `resumoCurtoBloqueio` reconhecendo `00:00–23:59` como "o dia todo"
- `BloqueioAppsScreen`: alternância do seletor, campos de hora aparecendo/desaparecendo, pré-seleção na 1ª configuração
- Regressão: `resumoCurtoBloqueio` (testes já existentes da HU-09) continuam passando para janelas específicas

## 7. Pendências

Nenhuma decisão de produto em aberto.
