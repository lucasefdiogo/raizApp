# Schema de Dados — Firebase (Firestore) + React Native

> Documento vivo — reflete o estado real do Firestore, não só o planejamento original.
> Última revisão: consolidação pós-auditoria do design system + features de bloqueio de
> apps, desafios e tarefas recorrentes.

Stack confirmada: **React Native CLI (bare workflow), TypeScript** no front, **Firebase**
no backend (Auth + Firestore + Cloud Messaging para notificações de Fase 2; sem Cloud
Functions ainda — ver seção 8).

---

## 1. Visão geral das coleções

```
users/{userId}
  └── dailyLogs/{YYYY-MM-DD}
  └── essentialTasks/{taskId}        (tarefas recorrentes — em uso, não mais opcional)
  └── challenges/{challengeId}       (desafios semanais/mensais — Fase 2)

phrases/{phraseId}                    (coleção global, banco de frases motivacionais)
systemMessages/{messageKey}           (coleção global, textos versionáveis sem update de app)
```

Princípio de modelagem mantido: **um documento por dia por usuário** (`dailyLogs`), sem
arrays que crescem indefinidamente no documento do usuário.

---

## 2. `users/{userId}`

| Campo | Tipo | Descrição |
|---|---|---|
| `email` | string | Do Firebase Auth (e-mail/senha ou Google) |
| `nome` | string | Preenchido no cadastro (SignUpScreen tem campo próprio) ou vazio se veio do Google sem nome |
| `createdAt` | timestamp | |
| **Onboarding** | | |
| `focoProcrastinacao` | string | chip selecionado: `estudos` \| `trabalho` \| `exercicio` \| `casa` \| `outro` |
| `tempoTelaEstimado` | number | minutos/dia |
| `porqueTexto` | string | Texto livre — reexibido na tela de retorno após pausa |
| `onboardingConcluido` | boolean | **Campo novo.** Gate real de saída do onboarding (substituiu a checagem antiga por `porqueTexto`). Setado como `true` só ao final do último passo (Primeira Tarefa), seja criando a tarefa ou pulando |
| **Streak** | | |
| `streakAtual` | number | |
| `diasTotaisAtivos` | number | Nunca reseta |
| `escudosDisponiveis` | number (0 ou 1) | |
| `dataUltimaRenovacaoEscudo` | timestamp | |
| `ultimoDiaAtivo` | string (`YYYY-MM-DD`) | |
| `statusStreak` | string | `ativo` \| `pausado` |
| `marcosAtingidos` | array\<number\> | ex: `[3, 7]` |
| **Preferências** | | |
| `notificacoesAtivas` | boolean | |
| `horarioLembreteDiario` | string (`HH:mm`) | |
| **Bloqueio de apps** *(campo novo — Fase 3)* | | |
| `bloqueioApps` | map | `{ ativo: boolean, appsSelecionados: string[] (package names), horarioInicio: string (HH:mm), horarioFim: string (HH:mm) }`. Default de quem nunca configurou: `{ ativo: false, appsSelecionados: [], horarioInicio: null, horarioFim: null }` |

> Nota de segurança já registrada: `streakAtual`/`escudosDisponiveis` continuam
> graváveis diretamente pelo client (dívida técnica original, ainda não endurecida).

---

## 3. `users/{userId}/dailyLogs/{YYYY-MM-DD}`

| Campo | Tipo | Descrição |
|---|---|---|
| `data` | string (`YYYY-MM-DD`) | |
| `tarefas` | array\<map\> | ver estrutura abaixo |
| `statusDia` | string | `pendente` \| `cumprido` \| `protegido_escudo` \| `perdido` |
| `escudoUsado` | boolean | |
| `desbloqueiosApps` | number | **Campo novo.** Contador de desbloqueios de apps bloqueados nesse dia — usado pela lógica de custo crescente (Fase 3). Default 0, incrementado atomicamente (`FieldValue.increment`) |
| `criadoEm` / `atualizadoEm` | timestamp | |

**Estrutura de cada item em `tarefas[]`:**
```
{
  id: string,
  titulo: string,
  essencial: boolean,
  concluida: boolean,
  concluidaEm: timestamp | null,
  tipo?: 'padrao' | 'exercicio',        // novo — default 'padrao' se ausente (retrocompat)
  duracaoMinutos?: number,               // novo — só relevante quando tipo === 'exercicio'
  origemRecorrenteId?: string            // novo — presente quando a tarefa nasceu de essentialTasks
}
```

Ao CRIAR um `dailyLog` novo (primeira leitura do dia, `garantirDailyLogDoDia`), o array
`tarefas[]` já nasce pré-populado com as `essentialTasks` ativas do usuário (ver seção 4)
— não é mais criado vazio por padrão.

---

## 4. `users/{userId}/essentialTasks/{taskId}`

**Não é mais opcional** — em uso desde a feature de tarefas recorrentes.

| Campo | Tipo | Descrição |
|---|---|---|
| `titulo` | string | |
| `essencial` | boolean | |
| `ativa` | boolean | `false` = parou de repetir, sem apagar o histórico já gerado em dias anteriores |
| `criadaEm` | timestamp | |

Gerenciamento: criar uma tarefa marcando "Repetir todos os dias" cria um doc aqui.
"Remover só hoje" (na Home) não mexe neste documento. "Parar de repetir" seta
`ativa: false`.

---

## 5. `users/{userId}/challenges/{challengeId}`

**Coleção nova** (Fase 2 — desafios semanais/mensais).

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | |
| `titulo` | string | Um dos 3 do catálogo fixo (ver `04-fase2.md`) |
| `tipo` | string | identifica qual regra de cálculo de progresso aplicar |
| `periodo` | string | `semanal` \| `mensal` |
| `dataInicio` / `dataFim` | string (`YYYY-MM-DD`) | Limites do período (semana = segunda a domingo, mês = dia 1 ao último dia) |
| `meta` | number | |
| `progresso` | number | Recalculado a partir dos `dailyLogs` reais do período, nunca incrementado manualmente |
| `status` | string | `ativo` \| `concluido` \| `expirado` |

Um desafio semanal + um mensal ativos por vez, gerados automaticamente no início de
cada período — usuário não cria nem escolhe.

---

## 6. `phrases/{phraseId}` (coleção global)

Sem mudança de estrutura. Populada via `seed-firestore.js` (Admin SDK — client não pode
escrever aqui, regra de segurança bloqueia).

| Campo | Tipo |
|---|---|
| `texto` | string |
| `tema` | `disciplina` \| `foco` \| `recomeco` \| `identidade` \| `desconforto` \| `pequenos_passos` |
| `contexto` | `home` \| `pos_recaida` \| `retorno` \| `marco` |
| `ativa` | boolean |

---

## 7. `systemMessages/{messageKey}` (coleção global)

Sem mudança de estrutura. Populada via `seed-firestore.js`.

| messageKey | Campos |
|---|---|
| `marco_3`, `marco_7`, `marco_14`, `marco_30`, `marco_60`, `marco_90` | `titulo`, `corpo` |
| `escudo_ativado` | `corpo` |
| `streak_reduzido` | `corpo` (placeholders `{{streak}}` e `{{diasTotais}}` — são dois valores diferentes, não repetir o mesmo número) |
| `retorno_pausa` | `corpo` (placeholder `{{porqueTexto}}`) |
| `dia_zerado` | `corpo` |

---

## 8. Cloud Functions — status real

**Nenhuma Cloud Function existe hoje.** Todo cálculo (streak, escudo, desafios,
notificações locais) roda no client, dívida técnica já registrada desde o início.

Exceção planejada: quando a assinatura com trial de 7 dias for retomada
(`procedimento-loja.md`), a verificação de compra via Google Play Developer API
**precisa** ser Cloud Function — é a primeira vez que o projeto exigirá o plano Blaze.
Real-time Developer Notifications (RTDN) também dependem dessa migração.

---

## 9. Regras de segurança (Firestore Security Rules) — estado atual

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read, update: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow delete: if false;

      match /dailyLogs/{date} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /essentialTasks/{taskId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /challenges/{challengeId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    match /phrases/{id} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    match /systemMessages/{id} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

Nota: exclusão de conta (`apagarTodosOsDadosDoUsuario`) apaga `dailyLogs`,
`essentialTasks` e o documento do usuário via client, nessa ordem específica (antes de
excluir o Auth) — ver dívida técnica equivalente já registrada no `CLAUDE.md`.

---

## 10. Mapeamento telas → coleções (referência rápida, atualizado)

| Tela | Lê | Escreve |
|---|---|---|
| Tutorial (4 slides) | — | AsyncStorage `tutorial_visto` (não é Firestore) |
| SignIn / SignUp / ForgotPassword | — | `users/{uid}` (criação, no primeiro signup por e-mail ou Google) |
| Onboarding (4 passos internos) | — | `users/{uid}` (foco, tempoTela, porquê, e a tarefa final grava também em `dailyLogs/{hoje}`), finaliza setando `onboardingConcluido = true` |
| Home | `users/{uid}`, `dailyLogs/{hoje}`, `essentialTasks` (ativas), `phrases`, `users/{uid}.bloqueioApps` | `dailyLogs/{hoje}.tarefas[]`, `essentialTasks` (ao criar/parar recorrente) |
| RecoveryStateScreen / ReturnAfterPauseScreen | `systemMessages`, `dailyLogs/{ontem}` | `users/{uid}.statusStreak` (retorno após pausa) |
| ProgressoScreen | `dailyLogs` (últimos 7 dias), `users/{uid}` (streak/dias ativos), `challenges` | — |
| AppBlockConfigScreen | `users/{uid}.bloqueioApps` | `users/{uid}.bloqueioApps` |
| AppBlockedScreen | `dailyLogs/{hoje}` (checar tarefas essenciais) | `dailyLogs/{hoje}.desbloqueiosApps` (increment) |
| PerfilScreen | `users/{uid}` | `users/{uid}` (porquê, notificações, horário), exclusão completa via `apagarTodosOsDadosDoUsuario` |

---

## 11. Próximo passo sugerido

Com o schema agora refletindo o estado real, o próximo documento mais urgente pra
atualizar é `navegacao-componentes-mvp.md` — a estrutura de navegação real (stack
único, onboarding reestruturado) já diverge da descrita lá, e o `design-system-rootora.md`
seção 8 hoje é mais confiável que este documento nesse tópico.
