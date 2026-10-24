# HU-14 — [Bloqueio] Aviso da sessão ativa e tempo até a próxima, cada um no lugar certo

> Facelift 2026 · funcionalidade nova sobre o motor de sessões já implementado (HU-04/05)
> Protótipo: `docs/hu/hu-14-timers-sessao.html` (telas 14.1 e 14.2) · visão geral em `docs/hu/rootora-facelift-visao-geral.html`
> Decisões tomadas em 23/out: notificação só para a sessão ativa (cooldown fica na tela). Ajustadas em 24/out: notificação a cada 5 min + aviso final de 1 min (não minuto a minuto); o tempo até a próxima sessão sai da notificação e passa a ser mostrado na Home, ao abrir o app
> Fontes: `09-ponte-fuga-tarefa-e-estou-travado.md` §3 e §10 (`SaldoBloqueioMaquina.kt`), `regras-de-negocio.md` §5

---

## 1. Título

**[Bloqueio] Aviso da sessão ativa e tempo até a próxima, cada um no lugar certo**

## 2. Cartão da HU

* **Como um(a):** pessoa numa sessão liberada ou esperando a próxima
* **Eu quero:** saber que a sessão está acabando sem precisar ficar de olho, e ver quanto falta pra próxima quando eu abro o app
* **Para que eu possa:** me programar sem notificação demais nem precisar abrir a interceptação

## 3. Protótipo / UX UI

Arquivo `docs/hu/hu-14-timers-sessao.html`:

| Tela | Estado | O que mostra |
|---|---|---|
| 14.1 | Notificação · sessão ativa | "Sessão em andamento · 10 min restantes", atualizada a cada 5 min + aviso final a 1 min, sobre o app liberado |
| 14.2 | Home · banner de cooldown | "Próxima sessão em 32 min", card no topo da Home, visível só enquanto o estado é cooldown |

**Dois mecanismos diferentes, para dois momentos diferentes (ajustado em 24/out):**
- **Sessão ativa** — a pessoa está usando o app liberado, de olho na tela dele, não no Rootora. Faz sentido uma notificação, mas sem atualizar toda hora: a cada 5 minutos, mais um aviso quando falta 1 minuto (como já existe hoje, só que agora dentro do mesmo mecanismo).
- **Cooldown** — a pessoa não está usando nada bloqueado; o tempo até a próxima sessão não precisa de notificação alguma, só aparece quando ela abre o Rootora, na própria Home.

Arquivos impactados (confirmar no código):
- `android/.../SaldoBloqueioMaquina.kt`: ao entrar em `SESSAO_ATIVA`, posta/atualiza a notificação a cada 5 min + 1 aviso final a 1 min; ao sair do estado, remove. Não posta mais nada em `COOLDOWN`.
- `src/native/`: novo wrapper (mesmo padrão de `AccessibilityDetection.ts`) pra ler o estado atual da máquina (`COOLDOWN` + minutos restantes) do SharedPreferences nativo
- `src/hooks/`: novo hook (`useCooldownRestante` ou equivalente) que lê esse estado ao focar a Home e atualiza a cada 1 min enquanto a tela estiver em foco
- `src/screens/HomeScreen.tsx` / `src/components/`: novo banner de cooldown, topo da Home

## 4. Regras de Negócio

* **RN01 — Notificação só na sessão ativa:** notificação Android persistente, postada pelo lado nativo, só quando o estado for `SESSAO_ATIVA`. `COOLDOWN` não posta nenhuma notificação (ajustado em 24/out — antes a notificação também cobria o cooldown).
* **RN02 — Texto:** "Sessão em andamento · {N} min restantes nesta sessão".
* **RN03 — Frequência:** atualiza a cada 5 minutos corridos desde o início da sessão (ex.: aos 5, 10 min...), mais uma atualização final de "1 min restante nesta sessão" quando resta 1 minuto — não é contagem minuto a minuto (ajustado em 24/out).
* **RN04 — Fim da notificação:** desaparece quando a sessão termina e o cooldown começa — nenhuma notificação nova é criada nesse momento.
* **RN05 — Banner de cooldown na Home:** com o estado em `COOLDOWN`, a Home mostra um card no topo (entre o cabeçalho e a lista de tarefas) com "Próxima sessão em {N} min", lido do estado nativo ao abrir ou focar a tela.
* **RN06 — Atualização do banner:** atualiza a cada 1 minuto enquanto a Home permanece em foco (sem notificação, sem trabalho em segundo plano — só enquanto a tela está aberta).
* **RN07 — Banner some:** desaparece assim que o estado sai de `COOLDOWN` (`AGUARDANDO_LIBERACAO` ou `SALDO_ZERADO`), na próxima vez que a Home recalcula (foco ou virada do minuto).
* **RN08 — Toque na notificação:** abre o Rootora na Home (decidido em 23/out) — mesmo lugar onde o banner de cooldown já aparece.
* **RN09 — Não dispensável por swipe:** a notificação de sessão é `ongoing` enquanto o estado permanece `SESSAO_ATIVA` — só desaparece quando a sessão termina.
* **RN10 — Sem permissão nova:** a notificação usa o canal já concedido pelo `notifee`; a leitura do estado pela Home usa o mesmo padrão de ponte nativa já existente (`src/native/`), sem escrita nova no Firestore.
* **RN11 — Privacidade e tom:** nenhum dado pessoal (app aberto, texto da intenção) em nenhum dos dois lugares — só a contagem em minutos. Sem ponto de exclamação, sem "bloqueado" nem "proteção".

## 5. Critérios de Aceite (BDD/Gherkin)

```gherkin
Cenário 1: Notificação aparece ao iniciar uma sessão
  Dado que acabei de liberar uma sessão de 15 min
  Quando a sessão começa
  Então vejo a notificação "Sessão em andamento · 15 min restantes nesta sessão"

Cenário 2: Notificação atualiza a cada 5 minutos
  Dado que estou numa sessão com a notificação mostrando "15 min restantes"
  Quando passam 5 minutos
  Então a notificação passa a mostrar "10 min restantes"
  E não houve nenhuma atualização nos minutos intermediários

Cenário 3: Aviso final a 1 minuto
  Dado que a sessão está em andamento
  Quando resta exatamente 1 minuto
  Então a notificação mostra "1 min restante nesta sessão", fora do ciclo de 5 em 5

Cenário 4: Notificação some ao entrar em cooldown
  Dado que minha sessão acabou de terminar
  Quando o cooldown começa
  Então a notificação de sessão desaparece
  E nenhuma notificação nova aparece

Cenário 5: Cooldown não gera notificação
  Dado que estou em cooldown
  Então não existe nenhuma notificação do Rootora sobre isso

Cenário 6: Home mostra o tempo até a próxima sessão
  Dado que estou em cooldown com 32 min restantes
  Quando abro o Rootora
  Então vejo na Home o card "Próxima sessão em 32 min"

Cenário 7: Banner atualiza com a tela aberta
  Dado que o banner mostra "32 min" na Home
  Quando fico na Home e passa 1 minuto
  Então o banner passa a mostrar "31 min"

Cenário 8: Banner some quando a sessão libera
  Dado que o banner de cooldown está visível
  Quando o cooldown termina e a próxima sessão fica disponível
  Então o banner some da Home

Cenário 9: Tocar na notificação abre a Home
  Dado que a notificação de sessão está visível
  Quando toco nela
  Então o Rootora abre direto na aba Hoje

Cenário 10: Sem dado pessoal em nenhum dos dois
  Dado que estou numa sessão ativa no Instagram, com uma intenção escrita
  Quando vejo a notificação ou o banner
  Então nenhum dos dois mostra o nome do app nem o texto da intenção
```

## 6. Testes sugeridos

Seguindo o CLAUDE.md: `describe('HU-14 · Aviso de sessão e tempo até a próxima', ...)` e `it('Cenário N: ...')`.

- Nativo (JUnit): agendamento a cada 5 min + aviso final de 1 min, texto formatado, remoção ao sair de `SESSAO_ATIVA`, ausência de notificação em `COOLDOWN`
- `native/` (ponte de leitura do estado): retorno correto de `COOLDOWN` + minutos restantes, e de "fora do cooldown" (sem banner)
- `useCooldownRestante`/hook equivalente: atualização a cada 1 min com a tela em foco, parada ao perder o foco
- `HomeScreen`: banner aparece/some conforme o estado, texto formatado
- Teste manual em device físico obrigatório (como toda a interceptação): comportamento de notificação e de leitura do SharedPreferences nativo varia por fabricante

## 7. Pendências

Nenhuma decisão de produto em aberto. Local do banner (topo da Home, entre cabeçalho e lista de tarefas) e cadência de atualização (1 min com a tela em foco) foram definidos nesta HU — confirmar com Lucas se o posicionamento exato bater diferente do esperado ao ver o protótipo.
