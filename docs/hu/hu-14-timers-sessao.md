# HU-14 — [Bloqueio] Notificação com o tempo restante da sessão e até a próxima

> Facelift 2026 · funcionalidade nova sobre o motor de sessões já implementado (HU-04/05)
> Protótipo: `docs/hu/hu-14-timers-sessao.html` (telas 14.1 e 14.2) · visão geral em `docs/hu/rootora-facelift-visao-geral.html`
> Decisões tomadas em 23/out: notificação (não bolha flutuante), atualização a cada 1 minuto, toque abre a Home
> Fontes: `09-ponte-fuga-tarefa-e-estou-travado.md` §3 e §10 (`SaldoBloqueioMaquina.kt`), `regras-de-negocio.md` §5

---

## 1. Título

**[Bloqueio] Notificação com o tempo restante da sessão e até a próxima**

## 2. Cartão da HU

* **Como um(a):** pessoa numa sessão liberada ou esperando a próxima
* **Eu quero:** ver quanto tempo falta pra sessão acabar, ou quanto falta pra próxima ficar disponível, sem precisar abrir a interceptação
* **Para que eu possa:** me programar sem ficar checando o Rootora toda hora

## 3. Protótipo / UX UI

Arquivo `docs/hu/hu-14-timers-sessao.html`:

| Tela | Estado | O que mostra |
|---|---|---|
| 14.1 | Notificação · sessão ativa | "Sessão em andamento · 9 min restantes nesta sessão", sobre o app liberado |
| 14.2 | Notificação · cooldown | "Pausa entre sessões · Próxima sessão em 32 min", sobre a Home |

**O que já existe e o que falta:** a `EsperaBloqueioScreen` já mostra "próximo acesso em X min" durante o cooldown (`regras-de-negocio.md` §5) — mas só enquanto essa tela está aberta. A sessão ativa só tem um aviso único "1 minuto restante" perto do fim (`09-ponte-fuga-tarefa...md` §3) — nenhuma contagem contínua. Esta HU cobre os dois casos com uma notificação persistente, visível o tempo todo enquanto o estado durar.

### 3.1 Onde decidimos encaixar

O estado real (sessão ativa / cooldown) vive só em SharedPreferences nativo (`SaldoBloqueioMaquina.kt`), sem sincronização com o Firestore em tempo real — por isso qualquer indicador contínuo precisa ser postado pelo próprio nativo, não lido por uma tela React Native. Entre uma bolha flutuante sobre a tela (exige permissão `SYSTEM_ALERT_WINDOW`, mais escrutínio de loja, mais engenharia) e uma notificação persistente (reusa o `notifee` já integrado, sem permissão nova), ficou decidido usar **notificação**.

Arquivos impactados (confirmar no código):
- `android/.../SaldoBloqueioMaquina.kt`: ao entrar/permanecer em `SESSAO_ATIVA` ou `COOLDOWN`, posta/atualiza a notificação a cada virada de minuto; ao saír desses estados, remove
- Canal de notificação próprio ("Rootora · Bloqueio"), prioridade baixa, sem som — reaproveita a infra do `notifee` já usada pelo lembrete diário e pelo aviso de serviço desligado

## 4. Regras de Negócio

* **RN01 — Quando aparece:** notificação Android persistente, postada pelo lado nativo, sempre que o estado da máquina for `SESSAO_ATIVA` ou `COOLDOWN`. Some ao sair desses dois estados (volta a `AGUARDANDO_LIBERACAO` ou `SALDO_ZERADO`).
* **RN02 — Texto em sessão ativa:** título "Sessão em andamento", texto "{N} min restantes nesta sessão".
* **RN03 — Texto em cooldown:** título "Pausa entre sessões", texto "Próxima sessão em {N} min".
* **RN04 — Frequência:** atualiza a cada 1 minuto, a partir do timestamp absoluto já existente na máquina de estados — sem novo cálculo nem campo novo. Não é contagem em tempo real (decidido em 23/out, pelo custo de bateria x precisão necessária).
* **RN05 — Toque:** tocar na notificação abre o Rootora na Home (decidido em 23/out) — nunca a interceptação nem nenhuma tela de configuração.
* **RN06 — Só nesses dois estados:** a notificação nunca aparece durante pausa de intenção, válvulas (acesso rápido/emergência/sessão de foco/tarefas extras) ou saldo zerado — nesses casos a informação já está na própria tela da interceptação.
* **RN07 — Não dispensável por swipe:** enquanto o estado permanece `SESSAO_ATIVA` ou `COOLDOWN`, a notificação é `ongoing` — não desaparece por swipe manual, só quando o estado muda. Evita que a pessoa confunda "escondi o aviso" com "a sessão acabou".
* **RN08 — Sem permissão nova:** usa o canal de notificação já concedido pelo `notifee` (mesmo usado pelo lembrete diário e pelo aviso de serviço desligado).
* **RN09 — Tom:** sem ponto de exclamação, sem a palavra "bloqueado" nem "proteção".
* **RN10 — Privacidade:** nenhum dado pessoal (nome do app aberto, texto da pausa de intenção) aparece na notificação — só a contagem em minutos.

## 5. Critérios de Aceite (BDD/Gherkin)

```gherkin
Cenário 1: Notificação aparece ao iniciar uma sessão
  Dado que acabei de liberar uma sessão de 15 min
  Quando a sessão começa
  Então vejo a notificação "Sessão em andamento · 15 min restantes nesta sessão"

Cenário 2: Notificação atualiza a cada minuto
  Dado que estou numa sessão com a notificação mostrando "15 min restantes"
  Quando passa 1 minuto
  Então a notificação passa a mostrar "14 min restantes"

Cenário 3: Notificação muda ao entrar em cooldown
  Dado que minha sessão acabou de terminar
  Quando o cooldown de 45 min começa
  Então a notificação passa a mostrar "Pausa entre sessões · Próxima sessão em 45 min"

Cenário 4: Notificação desaparece ao sair de sessão/cooldown
  Dado que o cooldown chegou a 0 min
  Quando a próxima sessão fica disponível (AGUARDANDO_LIBERACAO)
  Então a notificação desaparece

Cenário 5: Tocar na notificação abre a Home
  Dado que a notificação de cooldown está visível
  Quando toco nela
  Então o Rootora abre direto na aba Hoje

Cenário 6: Sem notificação durante a pausa de intenção
  Dado que abri um app bloqueado e estou vendo a pausa de intenção
  Então não existe nenhuma notificação de timer

Cenário 7: Notificação não é dispensável por swipe
  Dado que estou numa sessão ativa com a notificação visível
  Quando tento arrastá-la para o lado na central de notificações
  Então ela continua visível

Cenário 8: Sem dado pessoal na notificação
  Dado que estou numa sessão ativa no Instagram, com uma intenção escrita
  Quando vejo a notificação
  Então ela mostra só a contagem em minutos
  E não mostra o nome do app nem o texto da intenção
```

## 6. Testes sugeridos

Seguindo o CLAUDE.md: `describe('HU-14 · Notificação de tempo restante', ...)` e `it('Cenário N: ...')`.

- Nativo (JUnit): agendamento e atualização por minuto a partir do timestamp absoluto, texto formatado para cada estado, remoção ao mudar de estado, comportamento `ongoing`
- Fixture compartilhada com `SaldoBloqueioMaquina.kt` (mesma máquina de estados já testada na HU-04/05) — a notificação só lê o estado, não decide nada novo
- Teste manual em device físico obrigatório (como toda a interceptação): comportamento de notificação varia por fabricante (otimização de bateria pode atrasar a atualização em alguns Android)

## 7. Pendências

Nenhuma decisão de produto em aberto — frequência (RN04) e ação do toque (RN05) decididas em 23/out.
