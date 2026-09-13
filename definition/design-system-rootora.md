# Design System — Rootora

Documento de referência única para toda a identidade visual e biblioteca de componentes
do app. Reflete o estado REAL do código (auditado e corrigido) — qualquer tela nova ou
ajuste de UI deve consultar este documento antes de inventar padrão novo.
Complementa `02-identidade-visual.md`, que é a fonte de verdade dos hex e do conceito;
aqui o foco é a implementação em componentes reais.

## 1. Tokens de cor (theme/colors.ts)

Fonte de verdade dos hex: `02-identidade-visual.md`. Corrigidos em `fix/color-palette-alignment`.

| Token | Hex | Uso |
|---|---|---|
| `casca` | `#EFEAE0` | Fundo padrão de toda tela — token único (a antiga duplicação `background`/`areiaClara` foi consolidada aqui) |
| `terraEscura` | `#2B2318` | Texto principal |
| `terraSuave` | `#6B5E45` | Texto secundário, labels, placeholders, borda/texto de botão secundário |
| `cobre` | `#B5772E` | Accent único — botão primário OU ponto de crescimento do ícone de raiz. Regra fixa: no máximo 1 ocorrência de Cobre por tela |
| `musgo` | `#3E4A34` | Estrutura da raiz, sucesso, tarefa concluída, aba ativa — nunca reaproveitado como cor de botão genérico |
| `areia` | `#E3DACB` | Fundo de cards, inputs, chips, citações, badge de streak (neutro, ver seção 5) |

Removidos por não pertencerem à paleta original: `branco` (#FFFFFF puro — identidade
pede "não um branco clínico", eliminado em favor de `casca`/`areia` conforme contexto),
`terraEscura2`, `erro` (vermelho — removido do uso em "Excluir conta", ver seção 6).

Camada semântica (aliases sobre os tokens acima, usados na maioria dos componentes):
`background` (`casca`), `surface` (`areia`), `textPrimary` (`terraEscura`),
`textSecondary` (`terraSuave`), `accent` (`cobre`), `overlay` (`terraEscura` com opacidade).

Ícone genérico do app (launcher, não segue tema, ver seção 10): fundo `#EFF0EA`,
estrutura `#222924`, accent `#AA572F` — cores médias entre os 3 temas testados, uso
exclusivo do ícone, nunca dentro do app.

## 2. Tipografia (theme/typography.ts)

| Papel | Fonte | Peso | Uso |
|---|---|---|---|
| Display | Zilla Slab | 500 (Medium) / 600 (SemiBold) | Headlines, números grandes (streak, marco), títulos de tela |
| Corpo | IBM Plex Sans | 400 / 500 / 600 | Toda UI funcional |
| Utilitária | Space Mono | 400 | Labels em caixa alta (eyebrow), datas, badges, contadores |

Arquivos de fonte vinculados nativamente em `android/app/src/main/assets/fonts/`
(`fix/native-font-linking`) — antes disso o app renderizava tudo na fonte padrão do
sistema; se algum dia a Home aparecer sem serifa no headline, é sinal de regressão
nesse link, não de código quebrado.

## 3. Espaçamento e forma

- `theme.radius`: `sm: 10`, `md: 14`, `lg: 18`, `full: 999`
- Sem sombra pesada nem gradiente — profundidade vem de borda 1px `terraSuave`/`line`
  (ver nota) + fundo `areia` sobre `casca`
- Padding interno de card: 11–14px · Gap entre itens de lista: 6–9px
- Uma ação primária por tela — nunca dois botões com o mesmo peso visual (regra de
  composição, não auditável por código, mas obrigatória em toda tela nova)

## 4. Ícone-assinatura — RootProgressIcon

`src/components/RootProgressIcon.tsx`. Prop `variant`:

| Variant | Aparência | Onde é usado |
|---|---|---|
| `completo` | Tronco sólido + ramos + ponto de crescimento Cobre no topo | Celebração de marco |
| `escudo` | Um ramo com opacidade 0.5, raiz principal intacta | RecoveryStateCard (dia protegido) |
| `reduzido` | Um ramo com opacidade 0.35 e traço mais fino (2px vs 4px) | RecoveryStateCard (streak reduzido) |
| `broto` | Só o ponto de crescimento + traço curto, sem ramificação | EmptyState, Splash/Loading |

## 5. Componentes base (átomos)

| Componente | Arquivo | Descrição |
|---|---|---|
| `PrimaryButton` | `src/components/PrimaryButton.tsx` | Fundo `cobre`, texto `casca`/`areia`, radius `md` (14px) |
| `SecondaryButton` | `src/components/SecondaryButton.tsx` | Tratamento único e neutro — borda `terraSuave`, texto `terraSuave`. Reutilizado pelo botão do TutorialSlide e pelo "Continuar com Google" (nenhum dos dois duplica estilo inline) |
| `TextField` | `src/components/TextField.tsx` | Campo de texto padrão |
| Toggle | inline (theme) | Trilho `terraSuave`/border (off) / `cobre` (on), círculo `casca` |
| Badge de streak | `src/components/StreakCard.tsx` | Fundo `areia`, texto `textPrimary`, Space Mono — deliberadamente neutro, não Cobre, pra não conflitar com outro CTA Cobre na mesma tela (ex: AppBlockBanner) |
| `DayStatusPill` | `src/components/progress/DayStatusPill.tsx` | Indicador de 1 dia no histórico semanal — cor por status (seção 7) |
| `StepDots` | `src/components/tutorial/StepDots.tsx` | Indicador de progresso em fluxo de passos |
| `LoadingIndicator` | `src/components/common/LoadingIndicator.tsx` | Variants `fullscreen`/`inline`, RootProgressIcon `broto` + pulso via `Animated` (core do RN, não Reanimated) |
| `EmptyState` | `src/components/common/EmptyState.tsx` | RootProgressIcon `broto` + título + corpo + CTA opcional |
| `Toast` | `src/components/common/Toast.tsx` | Fundo `terraEscura`, texto `areia`, auto-dismiss ~3s |

## 6. Componentes compostos (moléculas)

| Componente | Arquivo | Composição |
|---|---|---|
| `HomeHeader` | `src/components/home/HomeHeader.tsx` | Saudação por horário + nome à esquerda, badge de streak à direita |
| `StreakCard` | `src/components/StreakCard.tsx` | Streak atual + escudos disponíveis, logo abaixo do HomeHeader |
| `AppBlockBanner` | `src/components/home/AppBlockBanner.tsx` | Fundo `musgo`, eyebrow + corpo + botão Cobre + ✕ dispensar — só quando nenhum app configurado. Renderizado no fim da rolagem da Home, não logo após o header |
| `AppBlockStatusCard` | `src/components/home/AppBlockStatusCard.tsx` | Status ativo/agendado + chips de apps — mutuamente exclusivo com o banner acima |
| `TaskItem` | `src/components/home/TaskItem.tsx` | Checkbox + título + selo de essencial (estrela) + ícone ↻ se recorrente + ícone de exercício se `tipo === 'exercicio'` |
| `AddTaskForm` | `src/components/home/AddTaskForm.tsx` | Campo de título + toggle essencial + `TaskTypeToggle` (tipo exercício + duração) + toggle "Repetir todos os dias" |
| `TaskTypeToggle` | `src/components/home/TaskTypeToggle.tsx` | Sub-componente do AddTaskForm — alterna tipo padrão/exercício e campo de duração |
| `TaskCompletedOverlay` | `src/components/home/TaskCompletedOverlay.tsx` | Auto-dismiss ~1.5s, 1 de 3 frases fixas |
| `StreakMilestoneModal` | `src/components/home/StreakMilestoneModal.tsx` | RootProgressIcon `completo` + marco + corpo (systemMessages) + botão único |
| `RecoveryStateCard` | `src/components/recovery/RecoveryStateCard.tsx` | RootProgressIcon (`escudo`/`reduzido`) + corpo (systemMessages) |
| `ReturnAfterPauseCard` | `src/components/return/ReturnAfterPauseCard.tsx` | Corpo do sistema + blockquote do "porquê" + campo de texto + botão |
| `ChallengeCard` | `src/components/challenges/ChallengeCard.tsx` | Título + barra de progresso (`musgo`) + "X de Y" |
| `DayDetailSheet` | `src/components/progress/DayDetailSheet.tsx` | Label do dia + status + lista de tarefas somente-leitura |
| `AppSelectorItem` | `src/components/appblock/AppSelectorItem.tsx` | Ícone (base64) + nome + **checkbox** customizado (não Switch nativo — evita competir com o toque na linha inteira) |
| `ConfirmDeleteAccountModal` | `src/components/perfil/ConfirmDeleteAccountModal.tsx` | Modal de confirmação sóbrio — botão "Excluir conta" agora com o mesmo tratamento neutro do SecondaryButton (sem vermelho) |
| `RecurringTaskActionSheet` | `src/components/home/RecurringTaskActionSheet.tsx` | Menu de 3 opções — mesmo padrão VISUAL do modal de exclusão de conta (arquivo próprio, não reaproveita o componente em si) |

## 7. Cores de status (histórico semanal, `domain/progress.ts`)

| Status | Cor |
|---|---|
| `cumprido` | `musgo`, opacidade 1 |
| `protegido_escudo` | `musgo`, opacidade 0.5 (mesma do RootProgressIcon `escudo`) |
| `perdido` | `terraSuave`/border, opacidade 1 — nunca vermelho |
| `pendente` (hoje) | `cobre`, opacidade 1 — única ocorrência de destaque na faixa |
| `sem_registro` | `terraSuave`/border, opacidade 0.35 |

## 8. Arquitetura real de navegação

Diferente de módulos separados por stack — é **um único `Stack.Navigator`** em
`RootNavigator.tsx`, com todas as rotas (`Tutorial`, `SignIn`, `SignUp`,
`ForgotPassword`, `Onboarding`, `Main`) no mesmo `RootStackParamList`. "TutorialStack",
"AuthStack", "OnboardingStack" são nomes usados neste documento só como agrupamento
lógico da explicação, não arquivos separados no código.

`AppBlockedScreen` é renderizada pelo próprio `RootNavigator` como overlay
`position: absolute` por cima de tudo — não é filha de nenhuma tab/stack, aparece
independente de qual aba está ativa.

```
RootNavigator (Stack.Navigator único)
├── SplashScreen
├── Tutorial            (4 slides internos, TutorialScreen + TutorialSlide)
├── SignIn / SignUp / ForgotPassword
├── Onboarding          (OnboardingScreen.tsx — 1 tela, máquina de passos interna)
│     passos: OnboardingStepFoco → OnboardingStepTempoTela →
│              OnboardingStepPorque → OnboardingStepPrimeiraTarefa
│     gate de saída: users/{uid}.onboardingConcluido === true
│              (não mais porqueTexto — mudou em feature/onboarding-primeira-tarefa)
├── Main → MainTabNavigator (abas: Hoje / Progresso / Perfil)
│     tabBarActiveTintColor: cobre · tabBarInactiveTintColor: terraSuave
│     ├── HojeStack
│     │     ├── HomeScreen — HomeHeader → StreakCard → headline → lista de TaskItem +
│     │     │     AddTaskForm → AppBlockBanner/AppBlockStatusCard (fim da rolagem) →
│     │     │     TaskCompletedOverlay/StreakMilestoneModal (overlays condicionais)
│     │     ├── RecoveryStateScreen    (condicional, back bloqueado)
│     │     ├── ReturnAfterPauseScreen (condicional, back bloqueado)
│     │     └── AppBlockConfig         (2ª entrada pra mesma tela do PerfilStack)
│     ├── ProgressoStack
│     │     └── ProgressoScreen — 2 statbox, 7 DayStatusPill (abre DayDetailSheet),
│     │           ChallengeCard semanal + mensal
│     └── PerfilStack
│           ├── PerfilScreen — porquê, notificações+horário, entrada "Bloqueio de
│           │     apps", links legais, "Excluir conta" (neutro), "Sair", link de
│           │     debug (condicional, baixa prioridade)
│           ├── AppBlockConfigScreen — se Accessibility Service desativado, mostra
│           │     AccessibilityPrimingScreen no lugar do conteúdo; se ativado, lista
│           │     de AppSelectorItem + 2 seletores de horário + checkbox geral
│           └── AccessibilityDebug     (condicional a __DEV__, temporária por design)
└── AppBlockedScreen (overlay do RootNavigator, fora de qualquer stack/tab)
```

`SignUpScreen` tem 4 campos (Nome, E-mail, Senha, Confirmar senha), não 3.

## 9. Botões — regra consolidada

- **Primário**: sempre `PrimaryButton` (Cobre) — no máximo 1 por tela
- **Secundário/ghost**: sempre `SecondaryButton` (neutro, `terraSuave`) — nunca Musgo,
  nunca estilo inline duplicado em outro componente

## 10. O que NÃO segue este tema

- Ícone do app (launcher) é genérico, paleta própria (seção 1), não muda com seleção de
  tema (Fase 2, não implementada)
- Telas de priming de permissão (`AccessibilityPrimingScreen`,
  `NotificationPrimingScreen`) seguem a mesma paleta/tipografia deste documento — não
  têm identidade própria, só conteúdo específico de explicação de permissão
