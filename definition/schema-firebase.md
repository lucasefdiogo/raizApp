# Schema de Dados — Firebase (Firestore) + React Native

> Documento vivo — reflete o estado real do Firestore, não só o planejamento original.
> Última revisão: motor de sessões/válvulas de escape/rotina noturna (substitui o
> saldo de blocos por tarefa), coleta de uso e lista curada de redes sociais.

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
| `onboardingConcluido` | boolean | Gate real de saída do onboarding. Setado como `true` só ao final do último passo (Primeira Tarefa), seja criando a tarefa ou pulando |
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
| `regrasBloqueio` | map \| ausente | `{ apps: string[], janelas: [{ inicio: string (HH:mm), fim: string (HH:mm), diasSemana: number[] (0 = domingo) }] }`. `apps` só aceita pacotes da lista curada de redes sociais (`src/domain/`, ver seção "Lista curada" abaixo) — pacotes fora dela são removidos na primeira abertura após a atualização. Gravado pela tela "Bloqueio de apps" (Perfil). Opcionais, ausente = padrão: `duracaoBlocoMin` (15), `cooldownMin` (45), `blocosDiarios` ("sem limite") — motor de sessões com cooldown, ver `regras-de-negocio.md` seção 5. Ausente = usuário nunca configurou |
| `regrasBloqueioPendentes` | map \| `null` | `RegrasBloqueio` + `efetivaEm: string (YYYY-MM-DD)` — qualquer alteração feita depois da primeira configuração (regra única, sem distinguir afrouxar/endurecer), só promovida a partir de `efetivaEm` (`aplicarRegrasBloqueioPendentesSeVencidas`/`decidirGravacaoRegrasBloqueio`, domain/appBlock.ts). `null` explícito = sem pendência no momento |
| `consentimentoAcessibilidade` | string (`YYYY-MM-DD`) \| ausente | Data em que o usuário concordou com a divulgação em destaque do Accessibility Service (`DivulgacaoAcessibilidadeScreen`). Ausente = nunca concordou |
| `consentimentoAcessoUso` | string (`YYYY-MM-DD`) \| ausente | Data em que o usuário concordou em conceder o acesso de uso (`UsageStatsManager`) na `DivulgacaoAcessoUsoScreen`. Ausente = nunca concordou; sem isso, nada é coletado em `dailyLogs.usoApps` |
| `rotina` | map \| ausente | `{ dormirEstimado: string (HH:mm), acordarEstimado: string (HH:mm), confirmadoEm: string (YYYY-MM-DD) \| null, alternativaNoturna: string \| null, modoManual: boolean }`. Estimado a partir de `dailyLogs.usoApps.primeiroUsoDia`/`.ultimoUsoAntesPausaLonga` com 5+ dias de histórico; sem `confirmadoEm`, a janela noturna não é aplicada. `modoManual: true` pausa a reestimativa automática até "Recalcular automaticamente" ser usado. Ver `09-ponte-fuga-tarefa-e-estou-travado.md` seção 5 |

### Lista curada de redes sociais (`src/domain/`)
Constante única usada pela tela de bloqueio e pelo `<queries>` do manifesto (nunca
`QUERY_ALL_PACKAGES`): Instagram (`com.instagram.android`), TikTok
(`com.zhiliaoapp.musically`, `com.ss.android.ugc.trill`), Kwai (`com.kwai.video`),
Facebook (`com.facebook.katana`, `com.facebook.lite`), X (`com.twitter.android`),
Threads (`com.instagram.barcelona`), Reddit (`com.reddit.frontpage`), Pinterest
(`com.pinterest`), Snapchat (`com.snapchat.android`) e YouTube
(`com.google.android.youtube`).

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
| `sessoesFoco` | array\<map\> \| ausente | Sessões de foco do dia (TravadoFlow e o atalho neutro do cooldown) — ver estrutura abaixo. Gravado via `arrayUnion` (atômico, não lê+regrava o array inteiro). Ausente = nenhuma ainda |
| `resumoBloqueio` | map \| ausente | Resumo do motor de bloqueio do dia, pra estatísticas futuras: `{ sessoesUsadas: number, intencoes: string[], acessosRapidos: number, emergencias: number }`. Gravado via `increment`/`arrayUnion` (`registrarResumoBloqueioNoDia`). **`intencoes` é texto livre digitado pelo usuário na pausa de intenção — dado pessoal, descrito na seção 2.3 da política de privacidade (versão de 12/10/2026).** Ausente = nenhuma sessão/válvula usada ainda |
| `usoApps` | map \| ausente | `{ [packageName]: { segundos: number, aberturas: number }, primeiroUsoDia: string (ISO 8601), ultimoUsoAntesPausaLonga: string (ISO 8601) }`. Medido via `UsageStatsManager`, só pra pacotes da lista curada instalados — fonte independente do Accessibility Service. `primeiroUsoDia`/`ultimoUsoAntesPausaLonga` são a base da estimativa de `rotina` (seção 2). Gravar este campo nunca altera `tarefas`, `statusDia`, `escudoUsado` nem o streak. Ausente = acesso de uso nunca concedido ou sem uso coletado ainda |
| `acessibilidade` | map \| ausente | `{ desligadoEm: string[] (ISO 8601), religadoEm: string[] (ISO 8601) }` — histórico de desligamentos/religamentos do Accessibility Service, sincronizado do nativo via `arrayUnion` na abertura do app (idempotente, reenviar não duplica). Gravar este campo nunca altera `tarefas`, `statusDia`, `escudoUsado` nem o streak. Ausente = nenhum evento ainda |
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
  tarefaPaiId?: string,                  // presente quando nasceu do passo "confusão" do TravadoFlow
  quando?: string                        // "HH:mm", intenção de implementação (se-então)
}
```

**Estrutura de cada item em `sessoesFoco[]`** (spec `09-ponte-fuga-tarefa`):
```
{
  id: string,
  tarefaId: string | null,
  origem: 'interceptacao' | 'travado' | 'home',
  estadoTravado: 'confusao' | 'medo' | 'tedio' | 'energia' | null,  // dado emocional — nunca sai pro Analytics com identificador
  duracaoPlanejadaSeg: number,
  duracaoRealSeg: number,
  resultado: 'continuou' | 'concluiu_tarefa' | 'parou',
  criadoEm: string  // ISO 8601
}
```
> `origem: 'interceptacao'` mudou de sentido: antes era o "Fazer 2 minutos" do extinto
> estado A (ligado à tarefa essencial, com o botão "Liberar o app" no fim); hoje é só o
> atalho neutro de 5 min sem tarefa oferecido na tela de cooldown/saldo zerado
> (`EsperaBloqueioScreen`, ver `09-ponte-fuga-tarefa-e-estou-travado.md` seção 3).
> `resultado: 'liberou_app'` foi removido — nenhuma sessão de foco libera app algum ao
> terminar, qualquer que seja a origem (ver spec 09, seção 7).

> **Removido:** o array `interceptacoes[]` (log por evento com `estadoTela: 'A'|'B'|'C'`)
> não existe mais — os estados A/B/C da InterceptScreen foram extintos (motor de
> sessões) e nada o substitui; os contadores de `resumoBloqueio` bastam.

Ao CRIAR um `dailyLog` novo (primeira leitura do dia, `garantirDailyLogDoDia`), o array
`tarefas[]` já nasce pré-populado com as `essentialTasks` ativas do usuário (ver seção 4)
— não é mais criado vazio por padrão.

> Nota técnica: `salvarDailyLog` grava com `merge: true` — qualquer toque numa tarefa
> não sobrescreve o documento inteiro, preservando `sessoesFoco`/`resumoBloqueio`/
> `usoApps`/`acessibilidade` gravados por outra via.
> `registrarSessaoFocoNoDia`/`registrarResumoBloqueioNoDia` usam `arrayUnion`/`increment`
> (não ler+regravar o array/mapa inteiro) — corrige condição de corrida em gravações
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
| `tema` | `disciplina` \| `foco` \| `recomeco` \| `identidade` \| `desconforto` \| `pequenos_passos` \| `noturno` |
| `contexto` | `home` \| `pos_recaida` \| `retorno` \| `marco` |
| `ativa` | boolean |

> `tema: 'noturno'` é usado pela pausa de intenção e pelo acesso rápido dentro da
> janela noturna (ver `banco-de-frases.md` seção 7 e `regras-de-negocio.md` seção 5).

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
| BloqueioAppsScreen | `users/{uid}.regrasBloqueio`/`.regrasBloqueioPendentes`/`.rotina` | `users/{uid}.regrasBloqueio` (1ª configuração) ou `.regrasBloqueioPendentes` (qualquer alteração depois), `.rotina` (confirmação/edição manual) |
| DivulgacaoAcessibilidadeScreen | — | `users/{uid}.consentimentoAcessibilidade` (só ao tocar "Concordo e quero ativar") |
| DivulgacaoAcessoUsoScreen | — | `users/{uid}.consentimentoAcessoUso` (só ao tocar "Permitir acesso de uso") |
| TravadoFlowScreen / SessaoFocoScreen | `dailyLogs/{hoje}` (tarefas, via `useDailyTasks`) | `dailyLogs/{hoje}.tarefas[]` (subtarefa/edição/move pra amanhã), `dailyLogs/{hoje}.sessoesFoco[]` |
| InterceptScreen | `dailyLogs/{hoje}` (snapshot local + ao vivo via `useDailyTasks`), `users/{uid}.rotina` | `dailyLogs/{hoje}.resumoBloqueio`, `dailyLogs/{hoje}.sessoesFoco[]` (atalho de 5 min sem tarefa) |
| PerfilScreen | `users/{uid}` | `users/{uid}` (porquê, notificações, horário), exclusão completa via `apagarTodosOsDadosDoUsuario` |

---

## 11. Próximo passo sugerido

Schema, regras de negócio e navegação (`regras-de-negocio.md`, `navegacao-componentes.md`)
estão alinhados com o motor de sessões/válvulas/rotina noturna. Próximo ponto de
atenção: nenhuma tela de Progresso ainda lê `resumoBloqueio`/`usoApps` de volta — os
dados são gravados mas ainda não aparecem em nenhuma visualização pro usuário (ver
`roadmap-e-status.md` pro resumo de bloqueio planejado no Progresso).

## Estado do motor de sessões (só nativo, fora do Firestore)

O estado do motor (sessão ativa, cooldown, saldo diário quando configurado, acessos
rápidos e emergências usados no dia, `fgDesde`) vive em SharedPreferences
(`rootora_saldo_bloqueio`, chave `estado`, JSON) — sobrevive a fechar o app e
reiniciar o aparelho, mas **não é sincronizado nem restaurado** (reinstalar zera). No
Firestore vai só o resumo (`resumoBloqueio`).
