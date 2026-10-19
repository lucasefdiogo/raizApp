# Schema de Dados — Firebase (Firestore) + React Native

> Documento vivo — reflete o estado real do Firestore, não só o planejamento original.
> Última revisão: consolidação pós-auditoria do design system + features de bloqueio de
> apps, desafios e tarefas recorrentes.

Stack confirmada: **React Native CLI (bare workflow), TypeScript** no front, **Firebase**
no backend (Auth + Firestore + Cloud Messaging reservado para reengajamento futuro; sem Cloud
Functions ainda — ver seção 8).

---

## 1. Visão geral das coleções

```
users/{userId}
  └── dailyLogs/{YYYY-MM-DD}
  └── essentialTasks/{taskId}        (tarefas recorrentes — em uso, não mais opcional)
  └── challenges/{challengeId}       (desafios semanais/mensais)

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
| `focoProcrastinacao` | string | chip selecionado: `redes_sociais` \| `estudos` \| `trabalho` \| `organizacao_pessoal` \| `outro` (`OPCOES_FOCO_PROCRASTINACAO`, `domain/onboarding.ts`) |
| `tempoTelaEstimado` | number | minutos/dia |
| `porqueTexto` | string | Texto livre — reexibido na tela de retorno após pausa |
| `onboardingConcluido` | boolean | **Campo novo.** Gate real de saída do onboarding (substituiu a checagem antiga por `porqueTexto`). Setado como `true` só ao final do último passo (Primeira Tarefa), seja criando a tarefa ou pulando |
| **Streak** | | |
| `streakAtual` | number | |
| `diasTotaisAtivos` | number | Nunca reseta |
| `escudosDisponiveis` | number (0 ou 1) | |
| `dataUltimaRenovacaoEscudo` | timestamp | |
| `ultimoDiaAtivo` | string (`YYYY-MM-DD`) | |
| `statusStreak` | string | `ativo` \| `pausado` gravados hoje. O tipo `StatusStreak` também prevê `em_risco` e `perdido` (`src/domain/types.ts`), usados no cálculo em memória |
| `marcosAtingidos` | array\<number\> | ex: `[3, 7]` |
| **Preferências** | | |
| `notificacoesAtivas` | boolean | |
| `horarioLembreteDiario` | string (`HH:mm`) | |
| **Bloqueio de apps** *(ÚNICO schema — `bloqueioApps`/custo crescente removidos, sem migração de dado)* | | |
| `regrasBloqueio` | map \| ausente | `{ apps: string[], janelas: [{ inicio: string (HH:mm), fim: string (HH:mm), diasSemana: number[] (0 = domingo) }] }`. Gravado pela tela "Bloqueio de apps" (Perfil). Opcionais, ausente = padrão: `duracaoBlocoMin` (15), `toleranciaMin` (2), `cooldownMin` (30), `blocosDiarios` (4), `blocoPorTarefaExtra` (1) — saldo diário de blocos, ver `regras-de-negocio.md` seção 5. Ausente = usuário nunca configurou |
| `regrasBloqueioPendentes` | map \| `null` | `RegrasBloqueio` + `efetivaEm: string (YYYY-MM-DD)` — qualquer alteração feita depois da primeira configuração (regra única, sem distinguir afrouxar/endurecer), só promovida a partir de `efetivaEm` (`aplicarRegrasBloqueioPendentesSeVencidas`/`decidirGravacaoRegrasBloqueio`, domain/appBlock.ts). `null` explícito = sem pendência no momento |
| `consentimentoAcessibilidade` | string (`YYYY-MM-DD`) \| ausente | Data em que o usuário concordou com a divulgação em destaque do Accessibility Service (`DivulgacaoAcessibilidadeScreen`). Ausente = nunca concordou |

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
| `sessoesFoco` | array\<map\> \| ausente | Sessões de foco do dia (TravadoFlow/InterceptScreen) — ver estrutura abaixo. Gravado via `arrayUnion` (atômico, não lê+regrava o array inteiro). Ausente = nenhuma ainda |
| `interceptacoes` | array\<map\> \| ausente | Decisões tomadas na InterceptScreen — ver estrutura abaixo. Gravado via `arrayUnion`, mesmo racional. Ausente = nenhuma ainda |
| `resumoBloqueio` | map \| ausente | Resumo do saldo de blocos do dia, só pra estatísticas futuras: `{ blocosUsados: number, toleranciasUsadas: number, intencoes: string[] }`. Gravado via `increment`/`arrayUnion` (`registrarResumoBloqueioNoDia`). **`intencoes` é texto livre digitado pelo usuário na pausa de intenção — dado pessoal, descrito na seção 2.3 da política de privacidade (versão de 12/10/2026).** Ausente = nenhum bloco liberado ainda |
| `criadoEm` / `atualizadoEm` | timestamp | |

**Estrutura de cada item em `tarefas[]`:**
```
{
  id: string,
  titulo: string,
  essencial: boolean,
  concluida: boolean,
  concluidaEm: timestamp | null,
  tipo?: 'padrao' | 'exercicio',        // default 'padrao' se ausente (retrocompat)
  duracaoMinutos?: number,               // só relevante quando tipo === 'exercicio'
  origemRecorrenteId?: string,           // presente quando a tarefa nasceu de essentialTasks
  tarefaPaiId?: string,                  // novo — presente quando nasceu do passo "confusão" do TravadoFlow
  quando?: string                        // novo — "HH:mm", intenção de implementação (se-então)
}
```

**Estrutura de cada item em `sessoesFoco[]`** (novo, spec `09-ponte-fuga-tarefa`):
```
{
  id: string,
  tarefaId: string | null,
  origem: 'interceptacao' | 'travado' | 'home',
  estadoTravado: 'confusao' | 'medo' | 'tedio' | 'energia' | null,  // dado emocional — nunca sai pro Analytics com identificador
  duracaoPlanejadaSeg: number,
  duracaoRealSeg: number,
  resultado: 'continuou' | 'concluiu_tarefa' | 'parou' | 'liberou_app',
  criadoEm: string  // ISO 8601
}
```

**Estrutura de cada item em `interceptacoes[]`** (novo, idem):
```
{
  app: string,       // package name
  hora: string,      // ISO 8601
  estadoTela: 'A' | 'B' | 'C',
  acao: 'sessao' | 'travado' | 'desafio' | 'liberou' | 'saiu'
}
```
> `'desafio'` continua no tipo `AcaoIntercept`, mas nenhum fluxo o grava mais: o
> "Desbloquear com desafio" foi removido do produto (ver `roadmap-e-status.md`).

Ao CRIAR um `dailyLog` novo (primeira leitura do dia, `garantirDailyLogDoDia`), o array
`tarefas[]` já nasce pré-populado com as `essentialTasks` ativas do usuário (ver seção 4)
— não é mais criado vazio por padrão.

> Nota técnica: `salvarDailyLog` grava com `merge: true` (corrigido junto da spec
> `09-ponte-fuga-tarefa`) — antes disso, qualquer toque numa tarefa sobrescrevia o
> documento inteiro e apagava `sessoesFoco`/`interceptacoes` gravados por outra via.
> `registrarSessaoFocoNoDia`/`registrarInterceptacaoNoDia` usam `arrayUnion` (não
> ler+regravar o array inteiro) — corrige uma condição de corrida real em gravações
> concorrentes.

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

Desafios semanais/mensais, em uso.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | |
| `titulo` | string | Um dos 3 do catálogo fixo (`src/domain/challenges.ts`, `regras-de-negocio.md`) |
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
      allow delete: if request.auth != null && request.auth.uid == userId;

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

> As regras estão versionadas em `firestore.rules` (raiz), referenciado em `firebase.json`.
> O bloco acima é igual ao arquivo. Ao mudar as regras, editar o arquivo e publicar com
> `firebase deploy --only firestore:rules` (passo manual, fora do Claude Code).
>
> **Histórico:** até out/2026 a regra publicada tinha `allow delete: if false` em
> `users/{userId}`, o que contradizia a exclusão de conta (`deleteDoc` em
> `apagarTodosOsDadosDoUsuario`). O arquivo agora libera `delete` só para o dono; a
> mudança só vale em produção depois do deploy das regras.

Nota: exclusão de conta (`apagarTodosOsDadosDoUsuario`) apaga `dailyLogs`,
`essentialTasks`, `challenges` e o documento do usuário via client, nessa ordem específica (antes de
excluir o Auth). A lista de subcoleções é `SUBCOLECOES_DO_USUARIO` em
`src/services/firestore.ts` — **ao criar uma subcoleção nova em `users/{uid}`, incluí-la lá**.
A exclusão client-side em si é dívida técnica (`stack-tecnico.md`).

---

## 10. Mapeamento telas → coleções (referência rápida, atualizado)

| Tela | Lê | Escreve |
|---|---|---|
| Tutorial (4 slides) | — | AsyncStorage `tutorial_visto` (não é Firestore) |
| SignIn / SignUp / ForgotPassword | — | `users/{uid}` (criação, no primeiro signup por e-mail ou Google) |
| Onboarding (4 passos internos) | — | `users/{uid}` (foco, tempoTela, porquê, e a tarefa final grava também em `dailyLogs/{hoje}`), finaliza setando `onboardingConcluido = true` |
| Home | `users/{uid}`, `dailyLogs/{hoje}`, `essentialTasks` (ativas), `phrases` | `dailyLogs/{hoje}.tarefas[]`, `essentialTasks` (ao criar/parar recorrente) |
| RecoveryStateScreen / ReturnAfterPauseScreen | `systemMessages`, `dailyLogs/{ontem}` | `users/{uid}.statusStreak` (retorno após pausa) |
| ProgressoScreen | `dailyLogs` (últimos 7 dias), `users/{uid}` (streak/dias ativos), `challenges` | — |
| BloqueioAppsScreen | `users/{uid}.regrasBloqueio`/`.regrasBloqueioPendentes` | `users/{uid}.regrasBloqueio` (1ª configuração) ou `.regrasBloqueioPendentes` (qualquer alteração depois) |
| DivulgacaoAcessibilidadeScreen | — | `users/{uid}.consentimentoAcessibilidade` (só ao tocar "Concordo e quero ativar") |
| TravadoFlowScreen / SessaoFocoScreen | `dailyLogs/{hoje}` (tarefas, via `useDailyTasks`) | `dailyLogs/{hoje}.tarefas[]` (subtarefa/edição/move pra amanhã), `dailyLogs/{hoje}.sessoesFoco[]` |
| InterceptScreen (+ InterceptDebugScreen) | `dailyLogs/{hoje}` (snapshot local + ao vivo via `useDailyTasks`) | `dailyLogs/{hoje}.tarefas[]` (estado C), `dailyLogs/{hoje}.interceptacoes[]`, `dailyLogs/{hoje}.resumoBloqueio` |
| PerfilScreen | `users/{uid}` | `users/{uid}` (porquê, notificações, horário), exclusão completa via `apagarTodosOsDadosDoUsuario` |

---

## 11. Próximo passo sugerido

Schema, regras de negócio e navegação (`regras-de-negocio.md`, `navegacao-componentes.md`)
estão alinhados com o código real após a remoção do bloqueio antigo e a chegada da
configuração mínima de `regrasBloqueio`. Próximo ponto de atenção: nenhuma tela de
Progresso ainda lê `interceptacoes`/`sessoesFoco` de volta — os dados são gravados mas
não aparecem em nenhuma visualização pro usuário.

## Estado do saldo de blocos (só nativo, fora do Firestore)

O estado do saldo diário (saldo, blocos usados, tempo consumido, tolerância, fim do
cooldown, `fgDesde`) vive em SharedPreferences (`rootora_saldo_bloqueio`, chave
`estado`, JSON) — sobrevive a fechar o app e reiniciar o aparelho, mas **não é
sincronizado nem restaurado** (reinstalar zera). No Firestore vai só o resumo
(`resumoBloqueio`).
