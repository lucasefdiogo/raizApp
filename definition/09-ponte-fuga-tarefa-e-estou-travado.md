# Ponte Fuga → Tarefa + "Estou travado"

> Extensão da funcionalidade de bloqueio de apps (05-fase3.md, item 2.1).
> Base teórica: Fundamentação Teórica, seções 2.2 (reparo de humor), 3 (ciclo), 7 (perfeccionismo), 10.2 (se-então) e 10.3 (fatiamento).
> Status: **validado** — decisões da seção 9 fechadas.

---

## 1. Problema que resolve

O app atuava antes da procrastinação (planejamento) e depois dela (streak, escudo, recaída), mas não durante o momento da fuga — quando a pessoa sente o desconforto da tarefa e abre um app de distração. Esta funcionalidade transforma o bloqueio de portão em ponte: o app de fuga passa a levar à tarefa evitada, reduzida a um passo mínimo.

Diferencial: nenhum concorrente conhecido conecta o app de fuga à tarefa específica que está sendo evitada.

---

## 2. Fluxo geral

```
Accessibility detecta app bloqueado
        │
        ▼
  InterceptScreen (estados A / B / C)
        │
        ├─► Fazer 2 minutos ──────► SessaoFocoScreen ─► FimSessao
        ├─► Estou travado ────────► TravadoFlow ─► SessaoFocoScreen ─► FimSessao
        ├─► Desbloquear com desafio (fluxo de desafios da Fase 3)
        └─► Sair (volta à tela inicial do Android)

Home ─► botão "Estou travado" (abaixo da lista) ─► TravadoFlow
TaskCard ─► toque longo ─► TravadoFlow (com a tarefa pré-selecionada)
```

---

## 3. InterceptScreen — 3 estados

| Estado | Condição | Texto | Ações |
|---|---|---|---|
| **A** | Existe tarefa essencial pendente | "Você ia abrir o [App]. A tarefa de hoje é *[tarefa]*. Topa só 2 minutos dela?" | Primária: **Fazer 2 minutos** · Secundárias: Estou travado · Desbloquear com desafio · Sair |
| **B** | Todas as essenciais concluídas | "Você já cumpriu o essencial de hoje. Liberar o [App] por 15 minutos?" | Primária: **Liberar** · Secundária: Agora não |
| **C** | Nenhuma tarefa cadastrada hoje | "Você ia abrir o [App]. Antes: qual é uma coisa pequena para hoje?" | Campo de texto → cria tarefa essencial → transita para estado A |

**Seleção da tarefa no estado A:** primeira essencial pendente; se houver campo `quando` preenchido, a de horário mais próximo do momento atual.

---

## 4. TravadoFlow

### Passo 1 — "O que está pegando agora?"
Chips de toque único, sem texto livre.

| Chip | Estado | Base teórica |
|---|---|---|
| Não sei por onde começar | `confusao` | Tarefa vaga/sem estrutura (Sirois & Pychyl) |
| Tenho medo de ficar ruim | `medo` | Preocupações perfeccionistas (Sirois et al., 2017) |
| Está chato demais | `tedio` | Aversividade da tarefa (Steel, 2007) |
| Estou sem energia | `energia` | Recurso real, não falha de caráter |

### Passo 2 — resposta por estado

| Estado | Texto | Ação |
|---|---|---|
| `confusao` | "Qual é o primeiro passo físico? Algo que dá para fazer em 2 minutos." Placeholder: *abrir o arquivo, separar o material* | Cria subtarefa (`tarefaPaiId`) → **Fazer agora** (timer 2 min) |
| `medo` | "Faça a versão feia primeiro. Ninguém vai ver o rascunho." | **Começar rascunho** (timer 5 min) |
| `tedio` | "Não precisa gostar. São 5 minutos, e você pode parar depois." | **Começar** (timer 5 min) |
| `energia` | "Energia baixa também é informação. Escolha o que cabe hoje." | **Fazer uma versão menor** (edita título da tarefa) · **Descansar 10 minutos longe do celular** (timer) · **Passar para amanhã** (move a tarefa e pede `quando`) |

"Passar para amanhã" não exibe nenhum texto de culpa. Se era a única essencial, o dia segue a regra normal de escudo/queda parcial.

---

## 5. SessaoFocoScreen e FimSessao

**Durante o timer:** "Só [N] minutos. Pode parar depois."
Se o usuário sair para um app bloqueado durante o timer, a interceptação reaparece mostrando o timer em andamento.

**Ao terminar:** "[N] minutos feitos. O começo era a parte difícil."

| Ação | Efeito | Visibilidade |
|---|---|---|
| **Continuar mais 10 minutos** (primária) | Novo timer de 10 min | Sempre |
| Marcar a tarefa como feita | Conclui a tarefa → overlay "Feito. Isso conta." | Sempre que houver `tarefaId` |
| Parar aqui | Registra a sessão, volta à Home, sem texto de cobrança | Sempre |
| Liberar o [App] por 15 minutos | Grava liberação temporária | Somente se `origem = interceptacao` |

### Regra de streak
Sessões de foco **não contam para o streak**. Só a conclusão de tarefa essencial conta (regra 1.1 inalterada). Evita que o timer vire atalho e esvazie o significado do streak.

---

## 6. Regra de alteração do bloqueio (substitui o custo crescente)

O "custo crescente de desbloqueio" previsto em 05-fase3.md é **substituído** pela regra de pré-compromisso:

- O usuário define apps bloqueados e janelas de horário num momento calmo.
- Qualquer alteração que **afrouxe** as regras (remover app, encurtar janela) só entra em vigor no dia seguinte.
- Alterações que **endurecem** as regras valem imediatamente.
- Texto ao salvar alteração que afrouxa: "Anotado. A nova regra começa amanhã."

Racional: impede renegociação no pico da vontade sem mecânica punitiva (princípio 3). Saída de emergência sempre disponível: o usuário pode desativar o Accessibility Service nas configurações do Android — o app não tenta impedir isso.

---

## 7. Schema — alterações

### `users/{uid}/dailyLogs/{YYYY-MM-DD}` — novos arrays

```
sessoesFoco: [{
  id: string,
  tarefaId: string | null,
  origem: 'interceptacao' | 'travado' | 'home',
  estadoTravado: 'confusao' | 'medo' | 'tedio' | 'energia' | null,
  duracaoPlanejadaSeg: number,
  duracaoRealSeg: number,
  resultado: 'continuou' | 'concluiu_tarefa' | 'parou' | 'liberou_app',
  criadoEm: timestamp
}]

interceptacoes: [{
  app: string,              // packageName
  hora: timestamp,
  estadoTela: 'A' | 'B' | 'C',
  acao: 'sessao' | 'travado' | 'desafio' | 'liberou' | 'saiu'
}]
```

### `tarefas[]` — campos opcionais novos
| Campo | Tipo | Uso |
|---|---|---|
| `tarefaPaiId` | string \| null | Subtarefa criada no fluxo `confusao` |
| `quando` | string (`HH:mm`) \| null | Intenção de implementação (se-então); usado na seleção da tarefa do estado A |

### `users/{uid}` — campos novos
| Campo | Tipo | Uso |
|---|---|---|
| `regrasBloqueio` | map `{ apps: string[], janelas: [{inicio, fim, diasSemana[]}] }` | Regras vigentes |
| `regrasBloqueioPendentes` | map `{ apps, janelas, efetivaEm: 'YYYY-MM-DD' }` \| null | Alteração que afrouxa, aplicada na primeira abertura a partir de `efetivaEm` |

### Privacidade
`estadoTravado` é dado emocional: fica somente no documento do próprio usuário. Não é enviado ao Analytics vinculado a identificador.

---

## 8. Integração nativa (Android)

| Ponto | Decisão | Motivo |
|---|---|---|
| Abrir a interceptação | Accessibility Service inicia `InterceptActivity`, que monta root RN separado (`AppRegistry.registerComponent('Intercept', ...)`) | Abre por cima do app bloqueado sem carregar a navegação completa |
| Dados do dia | RN grava **snapshot do dia** em SharedPreferences sempre que tarefas mudam (tarefas essenciais pendentes, `quando`, flag de essencial cumprido); nativo passa como `initialProps` | Tela precisa aparecer em < ~300 ms; não dá para esperar Firestore |
| Regras de bloqueio | RN espelha `regrasBloqueio` vigentes em SharedPreferences | Service consulta sem depender do JS estar rodando |
| Liberação temporária | `liberadoAte[packageName]` em SharedPreferences | Funciona com o app RN fechado |
| Escrita de registros | Root Intercept grava no Firestore com persistência offline | Não bloqueia a UI |

---

## 9. Decisões fechadas

| # | Decisão | Escolha |
|---|---|---|
| 1 | Liberar app após sessão de foco | Sim, como opção secundária, só quando a sessão veio da interceptação |
| 2 | Custo crescente vs. pré-compromisso | Pré-compromisso: afrouxar regras só vale amanhã (seção 6) |
| 3 | Posição do "Estou travado" | Botão discreto abaixo da lista na Home + toque longo no TaskCard |
| 4 | "Sem energia" recorrente | 5 de 7 dias → exibir uma vez linha gentil apontando para "Precisa de mais apoio?" no Perfil. **Texto exige revisão de psicólogo antes da publicação** |

Texto proposto para o item 4 (sujeito a revisão):
> "Você tem marcado energia baixa com frequência. Se isso estiver pesando, conversar com alguém pode ajudar."
> Link: "Precisa de mais apoio?" → Perfil (CVV 188, orientação para buscar psicólogo).

---

## 10. Métricas (Firebase Analytics)

| Evento | Parâmetros |
|---|---|
| `intercept_shown` | `estado_tela` |
| `intercept_action` | `acao` |
| `travado_opened` | `origem` |
| `travado_state` | `estado` (sem userId vinculado) |
| `focus_session_end` | `duracao_planejada`, `resultado` |

**Métricas de validação:**
- **Taxa de conversão da fuga** — % de interceptações (estado A) que viram sessão de foco
- **Taxa de embalo** — % de sessões com resultado `continuou` ou `concluiu_tarefa`

**Risco de métrica vazia: baixo.** Nenhuma das duas vira pontuação exibida ao usuário; ambas medem comportamento. Timer é autodeclarado, mas sessões não contam para streak, então não há incentivo a trapacear.

---

## 11. Critérios de aceite

- [ ] Interceptação aparece em < 300 ms após abrir app bloqueado dentro da janela
- [ ] Estados A, B e C exibidos conforme o snapshot do dia
- [ ] TravadoFlow acessível pela Home, pelo toque longo e pela interceptação, com o mesmo componente
- [ ] Sair do timer para app bloqueado reabre a interceptação com o timer ativo
- [ ] Sessões de foco não alteram `streakAtual`
- [ ] Alteração que afrouxa regras grava em `regrasBloqueioPendentes` e só vigora em `efetivaEm`
- [ ] Nenhum texto com ponto de exclamação, pedido de desculpas ou culpa
- [ ] `estadoTravado` ausente dos eventos de Analytics com identificador
