# Schema de Dados — Rootora

> Banco de dados: **Cloud Firestore** (projeto
> `raiz-app-71d02`). Princípio de modelagem: um documento por dia por usuário
> (`dailyLogs`), sem arrays que crescem indefinidamente no documento do usuário.

## Visão geral das coleções

```
users/{userId}
  └── dailyLogs/{YYYY-MM-DD}
  └── essentialTasks/{taskId}        (tarefas recorrentes)
  └── challenges/{challengeId}       (desafios semanais/mensais)

phrases/{phraseId}                    (coleção global, banco de frases motivacionais)
systemMessages/{messageKey}           (coleção global, textos versionáveis sem update de app)
```

## `users/{userId}`

| Campo | Tipo | Descrição |
|---|---|---|
| `email`, `nome`, `createdAt` | string / string / timestamp | Do Firebase Auth / cadastro |
| `focoProcrastinacao` | string | chip do onboarding: `redes_sociais` \| `estudos` \| `trabalho` \| `organizacao_pessoal` \| `outro` |
| `tempoTelaEstimado` | number | minutos/dia, do onboarding |
| `porqueTexto` | string | Texto livre do onboarding — reexibido na tela de retorno após pausa |
| `onboardingConcluido` | boolean | Gate real de saída do onboarding (setado só ao final do último passo) |
| `streakAtual` | number | |
| `diasTotaisAtivos` | number | Nunca reseta |
| `escudosDisponiveis` | number (0 ou 1) | Nome interno de "proteção" |
| `dataUltimaRenovacaoEscudo` | timestamp | |
| `ultimoDiaAtivo` | string (`YYYY-MM-DD`) | |
| `statusStreak` | string | `ativo` \| `pausado` gravados hoje (`em_risco`/`perdido` só em memória) |
| `marcosAtingidos` | array\<number\> | ex.: `[3, 7]` |
| `notificacoesAtivas` | boolean | |
| `horarioLembreteDiario` | string (`HH:mm`) | |
| `regrasBloqueio` | map \| ausente | `{ apps: string[], janelas: [{inicio, fim, diasSemana[]}], duracaoBlocoMin?, cooldownMin?, blocosDiarios? }`. `apps` só aceita pacotes da lista curada (abaixo) |
| `regrasBloqueioPendentes` | map \| `null` | `RegrasBloqueio` + `efetivaEm: YYYY-MM-DD` — regra de pré-compromisso (ver `regras-de-negocio.md` §6) |
| `consentimentoAcessibilidade` | string (`YYYY-MM-DD`) \| ausente | Data do consentimento na divulgação do Accessibility Service |
| `consentimentoAcessoUso` | string (`YYYY-MM-DD`) \| ausente | Data do consentimento no acesso de uso (`UsageStatsManager`) |
| `rotina` | map \| ausente | `{ dormirEstimado, acordarEstimado, confirmadoEm, alternativaNoturna, modoManual }` — estimado a partir de `dailyLogs.usoApps` |

**Lista curada de redes sociais** (`src/domain/`, único lugar com a constante): Instagram
(`com.instagram.android`), TikTok (`com.zhiliaoapp.musically`, `com.ss.android.ugc.trill`),
Kwai (`com.kwai.video`), Facebook (`com.facebook.katana`, `com.facebook.lite`), X
(`com.twitter.android`), Threads (`com.instagram.barcelona`), Reddit
(`com.reddit.frontpage`), Pinterest (`com.pinterest`), Snapchat (`com.snapchat.android`),
YouTube (`com.google.android.youtube`).

> Nota de segurança: `streakAtual`/`escudosDisponiveis` continuam graváveis diretamente pelo
> client (dívida técnica, ver `arquitetura.md`).

## `users/{userId}/dailyLogs/{YYYY-MM-DD}`

| Campo | Tipo | Descrição |
|---|---|---|
| `data` | string | `YYYY-MM-DD` |
| `tarefas` | array\<map\> | ver estrutura abaixo |
| `statusDia` | string | `pendente` \| `cumprido` \| `protegido_escudo` \| `perdido` |
| `escudoUsado` | boolean | |
| `sessoesFoco` | array\<map\> \| ausente | Sessões do TravadoFlow e do atalho neutro de cooldown. Gravado via `arrayUnion` |
| `resumoBloqueio` | map \| ausente | `{ sessoesUsadas, intencoes: string[], acessosRapidos, emergencias }`. `intencoes` é **dado pessoal** (texto livre da pausa de intenção) |
| `usoApps` | map \| ausente | `{ [packageName]: {segundos, aberturas}, primeiroUsoDia, ultimoUsoAntesPausaLonga }` (ISO 8601). Nunca altera `tarefas`/`statusDia`/`escudoUsado`/streak |
| `acessibilidade` | map \| ausente | `{ desligadoEm: string[], religadoEm: string[] }` — histórico sincronizado do nativo |
| `criadoEm` / `atualizadoEm` | timestamp | |

**Item de `tarefas[]`:**
```
{ id, titulo, essencial: boolean, concluida: boolean, concluidaEm: timestamp|null,
  tipo?: 'padrao'|'exercicio', duracaoMinutos?, origemRecorrenteId?, tarefaPaiId?, quando?: 'HH:mm' }
```

**Item de `sessoesFoco[]`:**
```
{ id, tarefaId: string|null, origem: 'interceptacao'|'travado'|'home',
  estadoTravado: 'confusao'|'medo'|'tedio'|'energia'|null,  // nunca sai pro Analytics com identificador
  duracaoPlanejadaSeg, duracaoRealSeg, resultado: 'continuou'|'concluiu_tarefa'|'parou', criadoEm }
```

Ao criar um `dailyLog` novo, `tarefas[]` já nasce pré-populado com as `essentialTasks` ativas.
Gravação com `merge: true`; `sessoesFoco`/`resumoBloqueio` usam `arrayUnion`/`increment` para
evitar condição de corrida.

## `users/{userId}/essentialTasks/{taskId}`

| Campo | Tipo | Descrição |
|---|---|---|
| `titulo` | string | |
| `essencial` | boolean | |
| `ativa` | boolean | `false` = parou de repetir, sem apagar histórico já gerado |
| `criadaEm` | timestamp | |

## `users/{userId}/challenges/{challengeId}`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` / `titulo` | string | Um dos 3 do catálogo fixo (`src/domain/challenges.ts`) |
| `tipo` | string | Qual regra de cálculo de progresso aplicar |
| `periodo` | string | `semanal` \| `mensal` |
| `dataInicio` / `dataFim` | string (`YYYY-MM-DD`) | |
| `meta` / `progresso` | number | `progresso` sempre recalculado dos `dailyLogs` reais |
| `status` | string | `ativo` \| `concluido` \| `expirado` |

## `phrases/{phraseId}` (coleção global)

Populada via `seed-firestore.js` (Admin SDK — regra de segurança bloqueia escrita do client).

| Campo | Tipo |
|---|---|
| `texto` | string |
| `tema` | `disciplina` \| `foco` \| `recomeco` \| `identidade` \| `desconforto` \| `pequenos_passos` \| `noturno` |
| `contexto` | `home` \| `pos_recaida` \| `retorno` \| `marco` |
| `ativa` | boolean |

**Regra de exibição:** frases de tema `recomeco` e `desconforto` nunca aparecem em dia comum na
Home — reservadas para telas de recaída e retorno. Mensagens de tema `noturno` usadas na pausa
de intenção e no acesso rápido dentro da janela noturna **vivem no código**
(`src/domain/mensagensNoturnas.ts`), não no Firestore, em rotação sequencial sem repetir a
anterior — nunca entram na Home.

**Conteúdo do banco** (o texto vive em `seed-firestore.js`; autoria própria, sem viés religioso):
7 temas com 6–9 frases cada (disciplina e ação, foco e distração, recomeço e recaída,
identidade e consistência, desconforto e tolerância, pequenos passos, noturno). Tom de voz
obrigatório: frases curtas, verbo no início quando possível, sem ponto de exclamação, sem
culpa, sem cobrança. Padrões proibidos documentados (comparação social, "sem desculpas",
glorificação de sofrimento, responsabilização punitiva) — nunca adicionar frase que viole os
5 princípios do produto (`spec.md`).

**Conteúdo bíblico (toggle futuro, fora do app hoje):** `banco-de-versiculos.md` (nesta pasta)
descreve uma coleção separada planejada, `biblicalPhrases/{phraseId}` (`referencia`, `texto`,
`traducao`, `tema`, `contexto`, `ativa`), usando a tradução Almeida (domínio público) para
evitar custo de licenciamento. Pendente de decisão de produto (ver `regras-de-negocio.md` §13) — mesma regra de exibição e mesmo critério de triagem contra conteúdo
culpabilizante do banco neutro.

## `systemMessages/{messageKey}` (coleção global)

Populada via `seed-firestore.js`.

| messageKey | Campos |
|---|---|
| `marco_3`, `marco_7`, `marco_14`, `marco_30`, `marco_60`, `marco_90` | `titulo`, `corpo` |
| `escudo_ativado` | `corpo` |
| `streak_reduzido` | `corpo` (placeholders `{{streak}}` e `{{diasTotais}}` — valores diferentes) |
| `retorno_pausa` | `corpo` (placeholder `{{porqueTexto}}`) |
| `dia_zerado` | `corpo` |

## Cloud Functions

**Nenhuma existe hoje** — todo cálculo (streak, escudo, desafios, notificações locais) roda no
client (dívida técnica, ver `arquitetura.md`). Exceção planejada: verificação de compra da
assinatura via Google Play Developer API, que exigirá o plano Blaze (ver `spec.md`, seção
"Loja e publicação").

## Regras de segurança (Firestore Security Rules)

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

Versionado em `firestore.rules` (raiz do repo), referenciado em `firebase.json`. Ao mudar,
editar o arquivo e publicar com `firebase deploy --only firestore:rules` (passo manual, fora do
Claude Code).

Exclusão de conta (`apagarTodosOsDadosDoUsuario`) apaga `dailyLogs`, `essentialTasks`,
`challenges` e o documento do usuário via client, nessa ordem, antes de excluir o Auth. A lista
de subcoleções é `SUBCOLECOES_DO_USUARIO` em `src/services/firestore.ts` — **ao criar uma
subcoleção nova em `users/{uid}`, incluí-la lá**. A exclusão client-side em si é dívida técnica
(ver `arquitetura.md`).

## Mapeamento telas → coleções

| Tela | Lê | Escreve |
|---|---|---|
| SignIn / SignUp / ForgotPassword | — | `users/{uid}` (criação) |
| Onboarding | — | `users/{uid}` (foco, tempoTela, porquê), `dailyLogs/{hoje}` (tarefa final), `onboardingConcluido` |
| Home | `users/{uid}`, `dailyLogs/{hoje}`, `essentialTasks`, `phrases` | `dailyLogs/{hoje}.tarefas[]`, `essentialTasks` |
| RecoveryStateScreen / ReturnAfterPauseScreen | `systemMessages`, `dailyLogs/{ontem}` | `users/{uid}.statusStreak` |
| ProgressoScreen | `dailyLogs` (7 dias), `users/{uid}`, `challenges` | — |
| BloqueioAppsScreen | `users/{uid}.regrasBloqueio`/`.regrasBloqueioPendentes`/`.rotina` | `users/{uid}.regrasBloqueio` (1ª config) ou `.regrasBloqueioPendentes` (depois), `.rotina` |
| DivulgacaoAcessibilidadeScreen / DivulgacaoAcessoUsoScreen | — | `users/{uid}.consentimentoAcessibilidade` / `.consentimentoAcessoUso` |
| TravadoFlowScreen / SessaoFocoScreen / InterceptScreen | `dailyLogs/{hoje}`, `users/{uid}.rotina` | `dailyLogs/{hoje}.tarefas[]`/`.sessoesFoco[]`/`.resumoBloqueio` |
| PerfilScreen | `users/{uid}` | `users/{uid}` (porquê, notificações, horário), exclusão completa |

## Estado fora do Firestore

O estado do motor de sessões (sessão ativa, cooldown, saldo diário, acessos rápidos/emergências
do dia) vive só em SharedPreferences nativo (`rootora_saldo_bloqueio`) — sobrevive a fechar o
app/reiniciar, mas **não é sincronizado nem restaurado** (reinstalar zera). No Firestore vai só
o resumo (`resumoBloqueio`).

## Pendências

Nenhuma tela de Progresso ainda lê `resumoBloqueio`/`usoApps` de volta — os dados são gravados
mas ainda não aparecem em nenhuma visualização para o usuário.
