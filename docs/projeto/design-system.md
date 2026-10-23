# Design System — Rootora

> Consolidado de `definition/design-system-rootora.md` (implementação real, auditada no
> código) e `definition/02-identidade-visual.md` (conceito/intenção de marca — fonte original
> dos hex). Tema único no MVP ("Raiz"); seleção de tema (Amanhecer/Raiz/Maré) é planejamento
> futuro, fora de escopo hoje.

## Conceito central

O símbolo do progresso não é uma chama (urgência, medo de perder — linguagem de apps de
streak comuns) nem um contador isolado. É um **sistema de raízes**: consistência que constrói
fundação por baixo antes de aparecer por fora. Nos dias perdidos, um ramo fica mais fino e
claro — a raiz principal segue firme; é a filosofia de "recaída sem vergonha" traduzida em
forma. Comunica honestamente o que a fundamentação teórica do produto aponta: autoconfiança se
constrói por acúmulo, não por recompensa imediata.

## Paleta (tokens de cor — `theme/colors.ts`)

| Token | Hex | Uso |
|---|---|---|
| `casca` | `#EFEAE0` | Fundo padrão de toda tela |
| `terraEscura` | `#2B2318` | Texto principal |
| `terraSuave` | `#6B5E45` | Texto secundário, labels, placeholders, borda/texto de botão secundário |
| `cobre` | `#B5772E` | Accent único — botão primário OU ponto de crescimento do ícone de raiz. **Máximo 1 ocorrência por tela** |
| `musgo` | `#3E4A34` | Estrutura da raiz, sucesso, tarefa concluída, aba ativa — nunca cor de botão genérico |
| `areia` | `#E3DACB` | Fundo de cards, inputs, chips, citações, badge de streak |

Removido por não pertencer à paleta: `branco` puro (`#FFFFFF`) — a identidade pede "não um
branco clínico", eliminado em favor de `casca`/`areia`.

**Tokens extras** (fora da paleta original, existem no código, usar com parcimônia):
`terraEscura2` (`#3E3126`, linha divisória do rodapé do StreakCard), `cobreClaro` (`#DA9A63`,
texto de rodapé e chips selecionados), `musgoClaro` (`#8A9678`), `erro` (`#B5473A`, só
mensagens de erro — nunca em "Excluir conta"), `border` (`#E3D8C3`).

**Camada semântica** (aliases usados na maioria dos componentes): `background` (`casca`),
`surface` (`areia`), `textPrimary` (`terraEscura`), `textSecondary` (`terraSuave`), `accent`
(`cobre`), `border`, `overlay` (`terraEscura` com opacidade).

Ícone genérico do app (launcher) **não** segue este tema: fundo `#EFF0EA`, estrutura `#222924`,
accent `#AA572F` — cores médias entre os 3 temas testados, uso exclusivo do ícone.

**Regra de uso do Cobre:** aparece no máximo uma vez por tela — o ponto de crescimento da raiz
ou o botão primário. O resto da paleta é propositalmente terroso e quieto.

## Tipografia (`theme/typography.ts`)

| Papel | Fonte | Peso | Uso |
|---|---|---|---|
| Display | Zilla Slab | 500 (Medium) / 600 (SemiBold) | Headlines, números grandes (streak, marco), títulos de tela — slab serif transmite solidez |
| Corpo | IBM Plex Sans | 400 / 500 / 600 | Toda UI funcional — tom técnico, "diário de campo" |
| Utilitária | Space Mono | 400 | Labels em caixa alta, datas, badges, contadores — reforça tom de registro |

Arquivos de fonte vinculados nativamente em `android/app/src/main/assets/fonts/`. Se a Home
aparecer sem serifa no headline, é sinal de regressão nesse link, não de código quebrado.

## Espaçamento e forma

- `theme.radius`: `sm: 10`, `md: 14`, `lg: 18`, `full: 999`
- Sem sombra pesada nem gradiente — profundidade vem de borda 1px `terraSuave`/`border` + fundo
  `areia` sobre `casca`
- Padding interno de card: 11–14px · Gap entre itens de lista: 6–9px
- **Uma ação primária por tela** — nunca dois botões com o mesmo peso visual (regra de
  composição obrigatória em toda tela nova)
- Cantos suavemente arredondados (10–14px), sem sombras pesadas nem gradientes decorativos
- Whitespace generoso, mas com leve textura terrosa de fundo — nunca branco clínico
- Sem "parede de troféus" — uma conquista por vez, em tela dedicada

## Ícone-assinatura — RootProgressIcon

`src/components/RootProgressIcon.tsx`. Formato: linha central (caule) que se ramifica
progressivamente — cada marco de streak adiciona uma ramificação visível. Ponto de crescimento
sempre em `cobre` (marca o "presente"); estrutura dos galhos em `musgo`.

| Variant | Aparência | Onde é usado |
|---|---|---|
| `completo` | Tronco sólido + ramos + ponto de crescimento Cobre no topo | Celebração de marco |
| `escudo` | Um ramo com opacidade 0.5, raiz principal intacta | RecoveryStateCard (dia protegido) |
| `reduzido` | Um ramo com opacidade 0.35 e traço mais fino (2px vs 4px) | RecoveryStateCard (streak reduzido) |
| `broto` | Só o ponto de crescimento + traço curto, sem ramificação | EmptyState, Splash/Loading |

Dia protegido por proteção: ramo translúcido/mais claro — "em pausa", não cortado. Dia perdido
sem proteção: ramo mais fino e com opacidade reduzida — a raiz principal nunca desaparece.

## Componentes base (átomos)

| Componente | Arquivo | Descrição |
|---|---|---|
| `PrimaryButton` | `src/components/PrimaryButton.tsx` | Fundo `cobre`, texto `casca`/`areia`, radius `md` |
| `SecondaryButton` | `src/components/SecondaryButton.tsx` | Tratamento único e neutro — borda/texto `terraSuave` |
| `TextField` | `src/components/TextField.tsx` | Campo de texto padrão |
| Toggle | inline (theme) | Trilho `terraSuave`/border (off) / `cobre` (on), círculo `casca` |
| Badge de streak | `src/components/StreakCard.tsx` | Fundo `areia`, texto `textPrimary`, Space Mono — deliberadamente neutro, não Cobre |
| `DayStatusPill` | `src/components/progress/DayStatusPill.tsx` | Indicador de 1 dia no histórico semanal (cores de status abaixo) |
| `StepDots` | `src/components/tutorial/StepDots.tsx` | Indicador de progresso em fluxo de passos |
| `LoadingIndicator` | `src/components/common/LoadingIndicator.tsx` | Variants `fullscreen`/`inline`, RootProgressIcon `broto` + pulso via `Animated` |
| `EmptyState` | `src/components/common/EmptyState.tsx` | RootProgressIcon `broto` + título + corpo + CTA opcional |
| `Toast` | `src/components/common/Toast.tsx` | Fundo `terraEscura`, texto `areia`, auto-dismiss ~3s |
| `ProgressDots` | `src/components/ProgressDots.tsx` | Pontos de progresso (`total`, `atual`) |
| `Chip` | `src/components/intercept/Chip.tsx` | Chip de toque único (TravadoFlow) |
| `LinkExterno` | `src/components/common/LinkExterno.tsx` | Link de texto que abre URL externa (links legais) |
| `BackButton` | `src/components/common/BackButton.tsx` | Botão de voltar das telas empilhadas |

## Componentes compostos (moléculas)

| Componente | Arquivo | Composição |
|---|---|---|
| `HomeHeader` | `src/components/home/HomeHeader.tsx` | Saudação por horário + nome, badge de streak |
| `StreakCard` | `src/components/StreakCard.tsx` | Streak atual + rodapé de garantia do dia (HU-07) — não mostra mais a contagem de proteções |
| `TaskList` / `TaskItem` | `src/components/TaskList.tsx` / `TaskItem.tsx` | Lista + item (checkbox, título, selo essencial, ícone recorrente/exercício) |
| `AddTaskForm` / `TaskTypeToggle` | `src/components/home/` | Sheet "Nova alternativa" (HU-07, Modal controlado pela Home) — sugestões em chip, campo título, toggle essencial + tipo/duração + "Repetir todos os dias" |
| `TaskActionsSheet` | `src/components/home/TaskActionsSheet.tsx` | Menu de toque longo: "Estou travado", editar, remover |
| `TaskCompletedOverlay` | `src/components/home/TaskCompletedOverlay.tsx` | Auto-dismiss ~1.5s, 1 de 3 frases fixas |
| `RootWateringOverlay` | `src/components/home/RootWateringOverlay.tsx` | Animação da raiz ao concluir a essencial |
| `FeatureTourOverlay` | `src/components/tour/FeatureTourOverlay.tsx` | Tour pós-onboarding |
| `StreakMilestoneModal` | `src/components/home/StreakMilestoneModal.tsx` | RootProgressIcon `completo` + marco + corpo + botão único |
| `RecoveryStateCard` | `src/components/recovery/RecoveryStateCard.tsx` | RootProgressIcon (`escudo`/`reduzido`) + corpo |
| `ReturnAfterPauseCard` | `src/components/return/ReturnAfterPauseCard.tsx` | Corpo + blockquote do "porquê" + campo + botão |
| `ChallengeCard` | `src/components/challenges/ChallengeCard.tsx` | Título + barra de progresso (`musgo`) + "X de Y" |
| `DayDetailSheet` | `src/components/progress/DayDetailSheet.tsx` | Label do dia + status + tarefas somente-leitura |
| `AppListItem` | `src/components/bloqueio/AppListItem.tsx` | Ícone + nome + checkbox customizado (não Switch nativo); caixa marcada em Musgo, não Cobre (HU-09) |
| `SeletorDiasSemana` | `src/components/bloqueio/SeletorDiasSemana.tsx` | 7 chips de toque único, preenchido Terra Escura quando selecionado, borda Terra Suave quando não (HU-09 — antes Cobre) |
| `SecaoConfig` | `src/components/bloqueio/SecaoConfig.tsx` | Cabeçalho de seção da `BloqueioAppsScreen`: eyebrow Space Mono + link opcional à direita (HU-09) |
| `SessoesInfoSheet` | `src/components/bloqueio/SessoesInfoSheet.tsx` | Sheet "Como funciona" da seção SESSÕES (HU-09) |
| `ConfirmDeleteAccountModal` | `src/components/perfil/ConfirmDeleteAccountModal.tsx` | Modal sóbrio — "Excluir conta" com tratamento neutro (sem vermelho) |

No Perfil, "Excluir conta" é um link de texto centralizado (Terra Suave, sublinhado), não mais
um botão com borda — único Cobre da tela acima dele é o toggle ligado do lembrete (HU-09).
`BloqueioAppsScreen` segue a mesma regra: único Cobre é o botão "Salvar".
| `RecurringTaskActionSheet` | `src/components/home/RecurringTaskActionSheet.tsx` | Menu de 3 opções |
| `AppChip` | `src/components/intercept/AppChip.tsx` | Ícone do app interceptado (PNG base64) + nome, topo de toda tela da interceptação (HU-11) |
| `InterceptLayout` | `src/components/intercept/InterceptLayout.tsx` | Esqueleto comum da interceptação (HU-11): `AppChip` + eyebrow (Space Mono) + headline opcional (Zilla Slab, itálico opcional) + `children` + "OUTRAS SAÍDAS" (`valvulas`/`onValvula`) + link "Voltar ao início" (saída total, nunca volta a uma sub-tela) |
| `ValvulaRow` | `src/components/intercept/ValvulaRow.tsx` | Uma linha de "OUTRAS SAÍDAS": ícone em círculo Musgo, título, descrição, meta (Space Mono, à direita). Indisponível usa Terra Suave esmaecida — nunca Cobre, nunca texto de negativa (RN02/RN11) |
| `ContagemEspera` | `src/components/intercept/ContagemEspera.tsx` | Contagem regressiva formatada (min/s) usada por `PausaIntencaoScreen`, `EsperaBloqueioScreen`, `EsperaAcessoRapidoScreen` |

## Cores de status (histórico semanal, `domain/progress.ts`)

| Status | Cor |
|---|---|
| `cumprido` | `musgo`, opacidade 1 |
| `protegido_escudo` | `musgo`, opacidade 0.5 |
| `perdido` | `terraSuave`/border, opacidade 1 — **nunca vermelho** |
| `pendente` (hoje) | `cobre`, opacidade 1 — única ocorrência de destaque na faixa |
| `sem_registro` | `terraSuave`/border, opacidade 0.35 |

## Botões — regra consolidada

- **Primário:** sempre `PrimaryButton` (Cobre) — no máximo 1 por tela
- **Secundário/ghost:** sempre `SecondaryButton` (neutro, `terraSuave`) — nunca Musgo, nunca
  estilo inline duplicado em outro componente

## Tom de voz

- Frases curtas, verbo no início, sem ponto de exclamação
- Pode dialogar levemente com a metáfora de raiz/crescimento em momentos-chave ("a raiz
  continua firme") — sem exagerar a ponto de virar clichê botânico
- Erros e recaídas: descrever o que aconteceu + próximo passo, nunca pedir desculpas nem culpar
- Sem emojis na UI funcional, exceto o 🌱 do badge de streak (parte da identidade)

## O que evitar deliberadamente

- Verde neon / chama laranja-vibrante (associação imediata com apps de streak comuns)
- Confete, partículas, celebração exagerada
- Ilustrações botânicas muito literais/fofas (risco de infantilizar o produto)
- Preto puro + neon ácido — sensação de urgência, oposto do conceito

## O que NÃO segue este tema

- Ícone do app (launcher): genérico, paleta própria, não muda com seleção de tema
- Telas de priming de permissão (`DivulgacaoAcessibilidadeScreen`,
  `NotificationPrimingScreen`) seguem a mesma paleta/tipografia — não têm identidade própria,
  só conteúdo específico de explicação de permissão
