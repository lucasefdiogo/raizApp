# HU-07 — [Hoje] Tarefas como alternativa à rolagem

> Facelift 2026 · 1ª na ordem (HU-07 → HU-10 → HU-09 → HU-11 → HU-08)
> Protótipo: `facelift-2026/hu-07-hoje-alternativas.html` (telas 07.1 a 07.4)
> Fontes: `design-system-rootora.md`, `navegacao-componentes.md` §2 (HomeScreen, TaskItem, AddTaskForm), `regras-de-negocio.md` §1–2, `roadmap-e-status.md` §4 e §17

---

## 1. Título

**[Hoje] Tarefas como alternativa à rolagem**

## 2. Cartão da HU

* **Como um(a):** pessoa que abre as redes sociais no automático
* **Eu quero:** ver minhas tarefas do dia como o que vou fazer no lugar da rolagem
* **Para que eu possa:** ter uma alternativa concreta à mão quando bater a vontade de abrir o feed

## 3. Protótipo / UX UI

Arquivo `facelift-2026/hu-07-hoje-alternativas.html`:

| Tela | Estado | O que muda |
|---|---|---|
| 07.1 | Dia em andamento | Headline novo, placar de essenciais em Space Mono, rodapé do `StreakCard` dizendo o que falta, linha "Adicionar alternativa" |
| 07.2 | Essencial concluída (`hojeCumprido`) | Headline "Hoje já conta. O resto é bônus.", linha de apoio, rodapé do `StreakCard` em Cobre Claro |
| 07.3 | Adicionar alternativa | `AddTaskForm` em bottom sheet, com sugestões em chips e toggles desligados por padrão |
| 07.4 | Sem tarefas | `EmptyState` (broto), com a linha tracejada como única ação |

Regras visuais (design system): fundo Casca, tarefas em Areia, sem sombra nem gradiente. **Único Cobre da Home:** o ponto de crescimento da raiz no `StreakCard` (a tab bar ativa segue o padrão já aprovado). Sem emoji, exceto o 🌱 do badge.

Arquivos impactados (estimativa, confirmar no código):
- `src/screens/HomeScreen.tsx`: headline, linha de apoio, placar, estado vazio
- `src/components/StreakCard.tsx`: texto do rodapé com e sem `hojeCumprido`
- `src/components/home/AddTaskForm.tsx`: título, placeholder, sugestões, contador de essenciais; passa a abrir como bottom sheet
- `src/domain/`: nova constante com as sugestões fixas (ex.: `sugestoesAlternativas.ts`)
- `src/components/tour/tourSteps.ts`: o texto do passo que aponta para o botão "Adicionar tarefa" passa a dizer "Adicionar alternativa"

Sem mudança no Firestore, em `useDailyTasks`, em `domain/streak.ts` nem na navegação.

## 4. Regras de Negócio

* **RN01:** O headline da seção de tarefas da Home passa de "Tarefas de hoje" para "O que você vai fazer no lugar da rolagem hoje?". O modelo `Tarefa` e o hook `useDailyTasks` não mudam.
* **RN02:** Não existe tela de check-in separada: concluir uma tarefa essencial na Home é o check-in do dia. A regra de dia cumprido (≥1 essencial concluída, `avaliarDiaCumprido`) não muda.
* **RN03:** Abaixo do headline, uma linha em Space Mono mostra o placar das essenciais: "ESSENCIAIS · {feitas} DE {total} FEITAS". Sem nenhuma essencial no dia, a linha mostra "MARQUE ATÉ 3 COMO ESSENCIAIS".
* **RN04:** Com `hojeCumprido = true`, o headline vira "Hoje já conta. O resto é bônus.", a linha de apoio vira "Se a vontade de abrir o feed aparecer, escolha uma daqui." e o placar some. O rodapé do `StreakCard` mostra "Hoje já está garantido" em Cobre Claro.
* **RN05:** Sem `hojeCumprido`, o rodapé do `StreakCard` mostra "Conclua 1 essencial para garantir hoje" em Musgo Claro.
* **RN06:** O botão "Adicionar tarefa" passa a se chamar "Adicionar alternativa" e abre o `AddTaskForm` como bottom sheet, com o título "Nova alternativa" e o placeholder "O que você faria em vez de abrir o feed?".
* **RN07:** O `AddTaskForm` mostra as sugestões fixas em chips, nesta ordem: "Ler 10 páginas", "Caminhar 15 min", "Alongar 5 min", "Arrumar a mesa". Se `rotina.alternativaNoturna` existir, ela aparece como primeiro chip, com borda Musgo. Tocar num chip só preenche o campo de título; a tarefa só é criada ao tocar "Adicionar".
* **RN08:** No sheet, os toggles "Essencial", "É exercício" e "Repetir todos os dias" vêm desligados, para o botão "Adicionar" ser o único Cobre. O toggle "Essencial" mostra "{n} de 3 usadas hoje".
* **RN09:** Com 3 essenciais já no dia, ligar "Essencial" é recusado (o toggle não liga) e aparece "Você já tem 3 essenciais hoje." (`LIMITE_TAREFAS_ESSENCIAIS` não muda).
* **RN10:** Dia sem nenhuma tarefa mostra o `EmptyState` com o broto, o título "Nada planejado ainda" e o corpo "Escolha uma coisa pequena para fazer no lugar da rolagem.". A única ação é a linha tracejada "Adicionar alternativa", sem `PrimaryButton`, porque o ponto Cobre do broto já é o destaque da tela.
* **RN11:** "Estou travado", o toque longo, a recorrência (↻), o tipo exercício e os overlays (`TaskCompletedOverlay`, `RootWateringOverlay`, `StreakMilestoneModal`) não mudam.
* **RN12:** Tom: sem ponto de exclamação, sem emoji (exceto o 🌱 do badge), e a palavra "check-in" não aparece na UI.

## 5. Critérios de Aceite (BDD/Gherkin)

```gherkin
Cenário 1: Headline de alternativas com essenciais pendentes
  Dado que tenho 2 tarefas essenciais hoje e nenhuma concluída
  Quando abro a aba Hoje
  Então vejo o título "O que você vai fazer no lugar da rolagem hoje?"
  E vejo "ESSENCIAIS · 0 DE 2 FEITAS"
  E o rodapé do StreakCard mostra "Conclua 1 essencial para garantir hoje"

Cenário 2: Dia sem essencial marcada
  Dado que tenho 2 tarefas hoje e nenhuma é essencial
  Quando abro a aba Hoje
  Então vejo "MARQUE ATÉ 3 COMO ESSENCIAIS" abaixo do título

Cenário 3: Concluir a essencial garante o dia
  Dado que tenho 1 tarefa essencial pendente
  Quando marco essa tarefa como concluída
  Então vejo o RootWateringOverlay
  E depois o título vira "Hoje já conta. O resto é bônus."
  E vejo "Se a vontade de abrir o feed aparecer, escolha uma daqui."
  E o rodapé do StreakCard mostra "Hoje já está garantido"

Cenário 4: Desmarcar a única essencial volta ao estado anterior
  Dado que concluí minha única tarefa essencial hoje
  Quando desmarco essa tarefa
  Então o título volta a ser "O que você vai fazer no lugar da rolagem hoje?"
  E vejo "ESSENCIAIS · 0 DE 1 FEITAS"

Cenário 5: Sugestão preenche sem criar a tarefa
  Dado que abri "Adicionar alternativa"
  Quando toco na sugestão "Ler 10 páginas"
  Então o campo de título fica "Ler 10 páginas"
  E nenhuma tarefa nova aparece na lista até eu tocar "Adicionar"

Cenário 6: Alternativa noturna aparece como primeira sugestão
  Dado que minha rotina.alternativaNoturna é "Ler antes de dormir"
  Quando abro "Adicionar alternativa"
  Então o primeiro chip é "Ler antes de dormir"
  E depois vêm "Ler 10 páginas", "Caminhar 15 min", "Alongar 5 min" e "Arrumar a mesa"

Cenário 7: Sem alternativa noturna, só as sugestões fixas
  Dado que não tenho rotina.alternativaNoturna
  Quando abro "Adicionar alternativa"
  Então vejo apenas as 4 sugestões fixas

Cenário 8: Teto de essenciais
  Dado que já tenho 3 tarefas essenciais hoje
  Quando tento ligar "Essencial" numa nova alternativa
  Então o toggle continua desligado
  E vejo "Você já tem 3 essenciais hoje."

Cenário 9: Dia sem tarefas
  Dado que não tenho nenhuma tarefa hoje
  Quando abro a aba Hoje
  Então vejo "Nada planejado ainda" com o ícone de broto
  E a única ação disponível é "Adicionar alternativa"

Cenário 10: Tour aponta para o botão renomeado
  Dado que acabei de concluir o onboarding
  Quando o tour de funcionalidades chega ao 2º passo
  Então o destaque fica sobre "Adicionar alternativa"
  E o texto do passo usa o nome "Adicionar alternativa"
```

## 6. Testes sugeridos (Jest + @testing-library/react-native)

- `HomeScreen`: headline e placar para 0/1/2 essenciais feitas, com e sem `hojeCumprido`, e lista vazia
- `StreakCard`: texto do rodapé com `hojeCumprido` verdadeiro e falso
- `AddTaskForm`: chip preenche o título sem chamar o criar; chip da `alternativaNoturna` presente e ausente; toggle "Essencial" bloqueado no teto
- Nenhum teste de `domain/streak.ts` muda (a regra não muda)

## 7. Pendências

- Validar o texto final das 4 sugestões fixas (devem ser curtas, físicas e fora do celular).
- Confirmar se o `AddTaskForm` hoje é inline. Se for, abrir como bottom sheet é uma mudança de comportamento, e o ref do tour continua apontando só para o botão.
