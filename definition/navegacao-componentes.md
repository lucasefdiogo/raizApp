# Navegação e Componentes — React Native (estado real)

> Documento vivo — reflete a árvore de navegação e os componentes REAIS do código, não
> mais o planejamento original. A divergência mais importante em relação à versão
> anterior: não existem stacks separados por arquivo (`AuthStack.tsx`,
> `OnboardingStack.tsx` etc.) — é **um único `Stack.Navigator`** com todas as rotas de
> topo, e o onboarding é **uma tela com máquina de passos interna**, não 3 rotas.

---

## 1. Árvore de navegação real

```
RootNavigator (Stack.Navigator único — RootStackParamList)
│
├── SplashScreen
│     Exibida no boot, até o maior entre (tempo mínimo 1200ms) e (checagens de
│     tutorial_visto + auth + onboardingConcluido resolvidas).
│
├── Tutorial            (rota única; TutorialScreen com carrossel interno de 4 slides)
│     Mostrada só se AsyncStorage não tiver tutorial_visto === 'true'.
│
├── SignIn / SignUp / ForgotPassword
│     Mostradas se tutorial_visto === 'true' e não há usuário autenticado
│     (nem e-mail/senha nem Google).
│
├── Onboarding          (rota única; OnboardingScreen com máquina de passos interna)
│     Mostrada se autenticado mas users/{uid}.onboardingConcluido !== true.
│     Passos internos, nessa ordem:
│       1. OnboardingStepFoco         (chips de foco de procrastinação)
│       2. OnboardingStepTempoTela    (slider de tempo de tela estimado)
│       3. OnboardingStepPorque       (campo de texto livre — NÃO é mais o gate final)
│       4. OnboardingStepPrimeiraTarefa (campo de tarefa + "Começar"/"Pular por hoje" —
│          É este passo que seta onboardingConcluido = true, não o "porquê")
│
├── Main → MainTabNavigator
│     Mostrada se autenticado E onboardingConcluido === true.
│     Abas: Hoje / Progresso / Perfil.
│     tabBarActiveTintColor: theme.colors.cobre
│     tabBarInactiveTintColor: theme.colors.terraSuave
│     │
│     ├── HojeStack
│     │     ├── HomeScreen               (rota padrão)
│     │     ├── RecoveryStateScreen      (condicional — statusDia de ontem
│     │     │     protegido_escudo/perdido, ainda não exibido hoje; back físico
│     │     │     bloqueado enquanto em foco)
│     │     ├── ReturnAfterPauseScreen   (condicional — statusStreak === 'pausado';
│     │     │     back físico bloqueado enquanto em foco)
│     │     └── AppBlockConfig           (2ª entrada de navegação pra mesma tela que
│     │           também vive em PerfilStack — acessível pelo banner/status card
│     │           de bloqueio de apps na Home)
│     │
│     ├── ProgressoStack
│     │     └── ProgressoScreen
│     │
│     └── PerfilStack
│           ├── PerfilScreen
│           ├── AppBlockConfigScreen     (mesma tela referenciada acima)
│           └── AccessibilityDebug       (condicional a __DEV__, temporária por
│                 design — não remover sem avisar, ainda é usada pra validar a
│                 detecção em dispositivo físico)
│
└── AppBlockedScreen
      NÃO é filha de nenhum stack/tab acima — é renderizada pelo próprio
      RootNavigator como overlay position: absolute por cima de TUDO, disparada por
      evento nativo (Accessibility Service detectando um app bloqueado em primeiro
      plano). Aparece independente de qual aba/tela estava ativa no momento.
```

### Lógica de decisão do `RootNavigator`

```
if (!tutorial_visto)              → Tutorial
else if (!user)                   → SignIn (+ SignUp/ForgotPassword acessíveis)
else if (!user.onboardingConcluido) → Onboarding
else                               → Main
```
Executada uma vez no boot (mais o AsyncStorage do tutorial), com SplashScreen cobrindo
enquanto resolve — nenhuma tela pisca durante o carregamento.

---

## 2. Componentes por tela (visão de composição real)

### HomeScreen
Ordem real de renderização, de cima pra baixo:
1. `HomeHeader` — saudação por horário + nome, badge de streak à direita
2. `StreakCard` — streak atual + escudos disponíveis (envolto num `View` com `ref`,
   ver "Tour de funcionalidades" abaixo)
3. Headline "Tarefas de hoje"
4. Lista de `TaskItem` + `AddTaskForm` (`forwardRef` — o `ref` aponta só pro botão
   "Adicionar tarefa", não pro formulário inteiro)
5. `AppBlockBanner` OU `AppBlockStatusCard` (mutuamente exclusivos, no fim da rolagem;
   o wrapper dos dois também carrega um `ref`)
6. Overlays condicionais por cima de tudo, nesta ordem: `TaskCompletedOverlay`,
   `StreakMilestoneModal`, `FeatureTourOverlay` (por último — fica por cima dos outros
   dois se coincidirem)

### `TaskItem`
| Prop | Tipo | Descrição |
|---|---|---|
| `titulo` | string | |
| `essencial` | boolean | Exibe selo de estrela |
| `concluida` | boolean | |
| `tipo` | `'padrao'` \| `'exercicio'` | Exibe ícone de exercício quando aplicável |
| `duracaoMinutos` | number opcional | Só exibido quando `tipo === 'exercicio'` |
| `origemRecorrenteId` | string opcional | Exibe ícone ↻; habilita toque longo → `RecurringTaskActionSheet` |
| `onToggle` | function | Escrita otimista + rollback silencioso em falha |

### `AddTaskForm`
Campo de título + toggle essencial + `TaskTypeToggle` (exercício/duração) + toggle
"Repetir todos os dias". Ao confirmar com recorrência ativada, cria `essentialTasks` +
a tarefa de hoje na mesma operação (nessa ordem — não cria tarefa órfã se a recorrente
falhar).

### `RecurringTaskActionSheet`
3 opções ao toque longo numa tarefa recorrente: "Remover só hoje" / "Parar de repetir" /
"Cancelar". Mesmo padrão visual do `ConfirmDeleteAccountModal`, arquivo próprio (não
importa o componente).

### `StreakMilestoneModal`
| Prop | Tipo |
|---|---|
| `marco` | number (3, 7, 14, 30, 60, 90) |
| `corpo` | string (de `systemMessages/marco_N`) |
| `onDismiss` | function |

### `RecoveryStateCard`
| Prop | Tipo |
|---|---|
| `tipo` | `'escudo'` \| `'reduzido'` |
| `corpo` | string (de `systemMessages`) |

### `ReturnAfterPauseCard`
| Prop | Tipo |
|---|---|
| `porqueTexto` | string |
| `corpoComTexto` | string (systemMessages com `{{porqueTexto}}` já substituído) |
| `onSubmitTarefa` | function |

### ProgressoScreen
1. 2 `statbox` (streakAtual, diasTotaisAtivos)
2. Faixa de 7 `DayStatusPill` — toque abre `DayDetailSheet` (exceto status
   `sem_registro`, que não faz nada ao toque)
3. `ChallengeCard` semanal + `ChallengeCard` mensal

### `DayDetailSheet`
| Prop | Tipo |
|---|---|
| `label` | string ("Quarta-feira · cumprido") |
| `tarefas` | array — renderização somente-leitura, sem toggle funcional |

### PerfilScreen
Seções, em ordem: "Seu porquê" (campo + botão Salvar explícito) → Notificações
(toggle + `DateTimePicker`) → entrada "Bloqueio de apps" → "Sobre" ("Ver tutorial
novamente", reinicia o tour de funcionalidades — ver seção própria abaixo — + links
legais: Política de Privacidade / Termos) → "Excluir conta" (`SecondaryButton` neutro,
sem vermelho, abre `ConfirmDeleteAccountModal`) → "Sair" → link de debug (condicional).

### AppBlockConfigScreen
Se `isAccessibilityServiceEnabled() === false`: renderiza `AccessibilityPrimingScreen`
no lugar do conteúdo normal. Se `true`: lista de `AppSelectorItem` (checkbox
customizado, não Switch) + 2 seletores de horário + checkbox geral de ativação.

### `AppSelectorItem`
| Prop | Tipo |
|---|---|
| `nome` / `icone` (base64) | string |
| `selecionado` | boolean |
| `onToggle` | function |

### AppBlockedScreen
Disparada por evento nativo (`blocked-app-detected`), não por navegação normal.
Mostra nome/ícone do app bloqueado + 2 caminhos de desbloqueio (tarefas essenciais /
pausa de respiração), com exigência crescente conforme `desbloqueiosApps` do dia
(ver `regras-streak-e-textos-mvp.md` e `05-fase3.md` pra regra de escalação).

### Telas de permissão
`AccessibilityPrimingScreen` (dentro do fluxo de AppBlockConfigScreen) e
`NotificationPrimingScreen` (antes do primeiro pedido de permissão de notificação, pós-
onboarding) — conteúdo fixo de explicação, sem lógica de negócio própria.

### Tour de funcionalidades (pós-onboarding)
Diferente do Tutorial Inicial (conceitual, pré-login, carrossel de 4 slides) — este
aponta pra elementos REAIS da UI já logada, na primeira vez que a `HomeScreen` renderiza
depois do onboarding. Controlado por `useFeatureTour` (AsyncStorage
`tour_funcionalidades_visto`, mesmo padrão de `tutorial_visto`); conteúdo dos 5 passos
em `src/components/tour/tourSteps.ts`; renderização em `FeatureTourOverlay.tsx`
(componente burro — recebe posição e texto já resolvidos, não decide nenhum dos dois).

5 alvos, nesta ordem: `StreakCard` → botão "Adicionar tarefa" → banner/status card de
bloqueio de apps (os 3 dentro da `HomeScreen`) → aba Progresso → aba Perfil (os 2
últimos na tab bar do `MainTabNavigator`, sem navegar de verdade — só recorte visual).

Posição vem de `measureInWindow` nos refs reais dos 5 elementos, nunca coordenada fixa.
Os refs das abas Progresso/Perfil só podem ser criados no `MainTabNavigator` (onde os
nós nativos existem — via `tabBarButton` customizado nessas 2 abas, preservando o toque
normal) e são repassados como prop simples até a `HomeScreen`, atravessando o
`HojeStack` sem lógica no meio (mesmo padrão de repasse já usado por
`avaliarAlertaRisco`). O overlay bloqueia toque em qualquer coisa por baixo enquanto
ativo — por isso não existe scroll "ao vivo" a acompanhar: ao entrar num passo cujo
alvo está fora da faixa visível, a `HomeScreen` rola até uma posição previsível antes de
remedir.

Link "Ver tutorial novamente" na `PerfilScreen` (seção "Sobre", junto dos links legais)
chama `useFeatureTour().reiniciar()` — reseta a flag e navega de volta pra aba Hoje, que
é onde o tour de fato aparece.

---

## 3. Bibliotecas em uso (atualizado)

| Necessidade | Biblioteca |
|---|---|
| Navegação | `@react-navigation/native` + `/native-stack` + `/bottom-tabs` |
| Firebase | `@react-native-firebase/app`, `/auth`, `/firestore`, `/messaging` (nativo, não SDK web) |
| Login Google | `@react-native-google-signin/google-signin` |
| Armazenamento local leve | `@react-native-async-storage/async-storage` |
| Animações | `react-native-reanimated` (usado em Splash/Tutorial; `LoadingIndicator` usa `Animated` do core, não Reanimated) |
| Notificações locais | `@notifee/react-native` (MVP usa local, não FCM — ver `CLAUDE.md`) |
| Seletor de horário | `@react-native-community/datetimepicker` |
| Ícones | `lucide-react-native` |
| Testes | Jest + `@testing-library/react-native` |

---

## 4. Próximo passo sugerido

Este documento e o `schema-firebase-mvp.md` agora refletem o estado real. Os próximos
mais desatualizados, em ordem de risco: `05-fase3.md` (implementação de bloqueio de
apps já avançou bem além do que está escrito lá) e `06-stack-desenvolvimento.md`
(faltam as libs novas e a dívida técnica cresceu).
