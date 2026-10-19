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

Removido por não pertencer à paleta original: `branco` (#FFFFFF puro — identidade
pede "não um branco clínico", eliminado em favor de `casca`/`areia` conforme contexto).

Tokens extras em `theme/colors.ts`, fora da paleta original de `02-identidade-visual.md`
(existem no código; usar com parcimônia):

| Token | Hex | Uso |
|---|---|---|
| `terraEscura2` | `#3E3126` | Linha divisória do rodapé do `StreakCard` |
| `cobreClaro` | `#DA9A63` | Texto do rodapé do `StreakCard`, chips selecionados do onboarding e destaque do `FeatureTourOverlay` |
| `musgoClaro` | `#8A9678` | Texto do rodapé do `StreakCard` e "✓" do `TaskCompletedOverlay` |
| `erro` | `#B5473A` | Mensagens de erro (`TextField`, telas de auth, `ReauthPromptModal`, `BloqueioAppsScreen`) e a ação "Remover" do `TaskActionsSheet`. **Não** é usado em "Excluir conta" (ver seção 6) |
| `border` | `#E3D8C3` | Bordas de 1px de cards, inputs e divisórias |

Camada semântica (aliases sobre os tokens acima, usados na maioria dos componentes):
`background` (`casca`), `surface` (`areia`), `textPrimary` (`terraEscura`),
`textSecondary` (`terraSuave`), `accent` (`cobre`), `border` (ver tabela acima),
`overlay` (`terraEscura` com opacidade).

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
| Badge de streak | `src/components/StreakCard.tsx` | Fundo `areia`, texto `textPrimary`, Space Mono — deliberadamente neutro, não Cobre, pra não conflitar com outro CTA Cobre na mesma tela (ex: botão "Salvar" de `BloqueioAppsScreen`) |
| `DayStatusPill` | `src/components/progress/DayStatusPill.tsx` | Indicador de 1 dia no histórico semanal — cor por status (seção 7) |
| `StepDots` | `src/components/tutorial/StepDots.tsx` | Indicador de progresso em fluxo de passos |
| `LoadingIndicator` | `src/components/common/LoadingIndicator.tsx` | Variants `fullscreen`/`inline`, RootProgressIcon `broto` + pulso via `Animated` (core do RN, não Reanimated) |
| `EmptyState` | `src/components/common/EmptyState.tsx` | RootProgressIcon `broto` + título + corpo + CTA opcional |
| `Toast` | `src/components/common/Toast.tsx` | Fundo `terraEscura`, texto `areia`, auto-dismiss ~3s |
| `ProgressDots` | `src/components/ProgressDots.tsx` | Pontos de progresso (`total`, `atual`) |
| `Chip` | `src/components/intercept/Chip.tsx` | Chip de toque único (escolha do TravadoFlow) |
| `LinkExterno` | `src/components/common/LinkExterno.tsx` | Link de texto que abre URL externa (links legais) |
| `BackButton` | `src/components/common/BackButton.tsx` | Botão de voltar das telas empilhadas |

## 6. Componentes compostos (moléculas)

| Componente | Arquivo | Composição |
|---|---|---|
| `HomeHeader` | `src/components/home/HomeHeader.tsx` | Saudação por horário + nome à esquerda, badge de streak à direita |
| `StreakCard` | `src/components/StreakCard.tsx` | Streak atual + escudos disponíveis, logo abaixo do HomeHeader |
| `TaskList` | `src/components/TaskList.tsx` | Lista de `TaskItem` da Home, repassa os handlers de cada tarefa |
| `TaskItem` | `src/components/TaskItem.tsx` | Checkbox + título + selo de essencial (estrela) + ícone ↻ se recorrente + ícone de exercício se `tipo === 'exercicio'` |
| `AddTaskForm` | `src/components/home/AddTaskForm.tsx` | Campo de título + toggle essencial + `TaskTypeToggle` (tipo exercício + duração) + toggle "Repetir todos os dias" |
| `TaskTypeToggle` | `src/components/home/TaskTypeToggle.tsx` | Sub-componente do AddTaskForm — alterna tipo padrão/exercício e campo de duração |
| `TaskActionsSheet` | `src/components/home/TaskActionsSheet.tsx` | Menu de toque longo em tarefa avulsa: "Estou travado", editar, remover |
| `TaskCompletedOverlay` | `src/components/home/TaskCompletedOverlay.tsx` | Auto-dismiss ~1.5s, 1 de 3 frases fixas |
| `RootWateringOverlay` | `src/components/home/RootWateringOverlay.tsx` | Animação da raiz ao concluir a essencial (ponto Cobre desce pelo caule, caule pulsa, barra até o próximo marco), ~3s ou toque fecha |
| `FeatureTourOverlay` | `src/components/tour/FeatureTourOverlay.tsx` | Tour pós-onboarding, burro: recebe posição e texto já resolvidos (`tourSteps.ts`) |
| `StreakMilestoneModal` | `src/components/home/StreakMilestoneModal.tsx` | RootProgressIcon `completo` + marco + corpo (systemMessages) + botão único |
| `RecoveryStateCard` | `src/components/recovery/RecoveryStateCard.tsx` | RootProgressIcon (`escudo`/`reduzido`) + corpo (systemMessages) |
| `ReturnAfterPauseCard` | `src/components/return/ReturnAfterPauseCard.tsx` | Corpo do sistema + blockquote do "porquê" + campo de texto + botão |
| `ChallengeCard` | `src/components/challenges/ChallengeCard.tsx` | Título + barra de progresso (`musgo`) + "X de Y" |
| `DayDetailSheet` | `src/components/progress/DayDetailSheet.tsx` | Label do dia + status + lista de tarefas somente-leitura |
| `AppListItem` | `src/components/bloqueio/AppListItem.tsx` | Ícone (base64, resolvido via `<queries>`) + nome + **checkbox** customizado (não Switch nativo — evita competir com o toque na linha inteira) |
| `SeletorDiasSemana` | `src/components/bloqueio/SeletorDiasSemana.tsx` | 7 chips de toque único (dias da semana), preenchido Cobre quando selecionado |
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

É **um único `Stack.Navigator`** em `RootNavigator.tsx`, com todas as rotas de topo
(`Tutorial`, `SignIn`, `SignUp`, `ForgotPassword`, `Onboarding`, `NotificationPriming`,
`Main`) no mesmo `RootStackParamList`; "AuthStack", "OnboardingStack" etc. são só
agrupamento lógico, não arquivos. A árvore completa (abas, `HojeStack`, `ProgressoStack`,
`PerfilStack`, rotas de debug e o root separado `Intercept`) vive em
`navegacao-componentes.md` seção 1 — fonte única, não duplicada aqui.

Não existe overlay global de bloqueio no `RootNavigator`: a interceptação acontece fora
da árvore, por um root RN separado (`InterceptRoot`/`InterceptScreen`, montado por uma
Activity Android diferente da `MainActivity`).

Resumo de composição por tela (detalhe em `navegacao-componentes.md` seção 2):
- Onboarding: 1 tela com 4 passos internos; gate de saída `users/{uid}.onboardingConcluido`
- Home: `HomeHeader` → `StreakCard` → headline → `TaskList` + `AddTaskForm` → overlays
- Progresso: 2 statbox, 7 `DayStatusPill` (abre `DayDetailSheet`), `ChallengeCard` semanal + mensal
- Perfil: porquê, notificações+horário, entrada "Bloqueio de apps", links legais,
  "Excluir conta" (neutro), "Sair", link de debug (condicional)

`SignUpScreen` tem 4 campos (Nome, E-mail, Senha, Confirmar senha), não 3.

## 9. Botões — regra consolidada

- **Primário**: sempre `PrimaryButton` (Cobre) — no máximo 1 por tela
- **Secundário/ghost**: sempre `SecondaryButton` (neutro, `terraSuave`) — nunca Musgo,
  nunca estilo inline duplicado em outro componente

## 10. O que NÃO segue este tema

- Ícone do app (launcher) é genérico, paleta própria (seção 1), não muda com seleção de
  tema (futuro, não implementada — ver `roadmap-e-status.md`)
- Telas de priming de permissão (`DivulgacaoAcessibilidadeScreen`,
  `NotificationPrimingScreen`) seguem a mesma paleta/tipografia deste documento — não
  têm identidade própria, só conteúdo específico de explicação de permissão
