# Roadmap e Status — Rootora

> Documento vivo. Substitui `03-mvp.md`, `04-fase2.md` e `05-fase3.md` como fonte de
> escopo — a divisão por fase burocrática deixou de refletir a ordem real de trabalho
> (o bloqueio de apps, originalmente Fase 3, já está mais avançado que vários itens da
> Fase 2). Organizado por **domínio funcional**, com status honesto sobre o que está
> confirmado vs. o que foi implementado mas ainda não confirmado em uso real.

**Legenda:** ✅ Pronto e confirmado · 🚧 Implementado, aguardando confirmação/teste ·
📋 Planejado, não iniciado

---

## 1. Fundação técnica

| Item | Status |
|---|---|
| Repositório GitHub + `.gitignore` (Firebase configs, service account key) | ✅ |
| `CLAUDE.md` — arquitetura, princípios, convenções | ✅ |
| Ambiente WSL2 + Android Studio + build funcional | ✅ |
| TypeScript estrito + `@testing-library/react-native` | ✅ |
| Firebase: projeto, Auth (e-mail/senha + Google), Firestore + rules publicadas | ✅ |
| Seed de `phrases`/`systemMessages` | ✅ |
| Ícone do app (genérico, tons terrosos) | ✅ |

## 2. Autenticação

| Item | Status |
|---|---|
| SignIn / SignUp / ForgotPassword (e-mail e senha) | ✅ |
| Google Sign-In | ✅ |
| Criação de `users/{uid}` no primeiro acesso (ambos os métodos) | ✅ |

## 3. Onboarding

| Item | Status |
|---|---|
| 4 passos (Foco → Tempo de tela → Porquê → Primeira Tarefa) | ✅ |
| Gate de conclusão via `onboardingConcluido` (não mais `porquê`) | ✅ confirmado em auditoria (11/set) |
| Persistência de progresso se o app fechar no meio | ✅ confirmado em auditoria (11/set) |

## 4. Home e tarefas diárias

| Item | Status |
|---|---|
| `useDailyTasks` real (Firestore, não mock) | ✅ |
| Limite de 3 tarefas essenciais, escrita otimista + rollback | ✅ |
| Tarefas recorrentes ("Repetir todos os dias", `essentialTasks`) | ✅ |
| Tipo "exercício" + duração em tarefa | ✅ |
| `HomeHeader` (saudação + badge de streak) | ✅ |
| `StreakCard` (streak + escudos disponíveis) | ✅ |

## 5. Streak e proteção (ex-"escudo")

| Item | Status |
|---|---|
| `domain/streak.ts` — cálculo real de dia cumprido/perdido/protegido | ✅ |
| Queda pra 50%, reset após 2+ dias, renovação semanal | ✅ |
| Celebração de marco (3/7/14/30/60/90 dias) | ✅ |
| Estados de recaída (proteção usada / streak reduzido) | ✅ |
| Retorno após pausa longa | ✅ |
| Renomeação de copy "escudo" → "proteção" | ✅ confirmado — última ocorrência corrigida em `DayDetailSheet.tsx` (11/set) |

## 6. Progresso

| Item | Status |
|---|---|
| Histórico de 7 dias + 2 números de resumo | ✅ |
| Ver detalhe de um dia passado (`DayDetailSheet`) | ✅ |

## 7. Desafios semanais/mensais

| Item | Status |
|---|---|
| Catálogo fixo de 3 desafios, cálculo automático de progresso | ✅ |
| `ChallengeCard` no Progresso | ✅ |

## 8. Bloqueio de apps (diferencial do produto)

| Item | Status |
|---|---|
| Detecção via Accessibility Service | ✅ validado em device físico |
| Tela de configuração (apps + horário) | ✅ validado em device físico |
| Overlay de bloqueio + desbloqueio (tarefas essenciais / respiração) | ✅ |
| Custo crescente entre desbloqueios (exigência sobe, teto no 3º) | ✅ confirmado em auditoria (11/set), com testes cobrindo os 3 níveis |
| Visibilidade na Home (banner / status card) | ✅ |
| Tela de priming — Accessibility Service | ✅ (card de aviso confirmado em auditoria) |
| Tela de priming — Notificações | ✅ implementada (11/set) |
| Desbloqueio por calorias (Health Connect) | 📋 |
| Widget de tela inicial (Android) | 📋 |
| Justificativa de uso do Accessibility Service pra ficha da Play Store | 📋 (`procedimento-loja.md`) |

## 9. Notificações

| Item | Status |
|---|---|
| Lembrete diário + alerta de risco de streak (local, `@notifee`) | ✅ |
| Configuração na tela de Perfil | ✅ |
| Notificação de reengajamento (FCM + Cloud Function) | 📋 deprioritizado |
| Notificações de progresso de desafios | 📋 deprioritizado |

## 10. Conta e conformidade

| Item | Status |
|---|---|
| Exclusão de conta (client-side, ordem correta de limpeza) | ✅ |
| Política de Privacidade + Termos — conteúdo (minuta) e links no app | 🚧 conteúdo pronto, hospedagem e **revisão jurídica ainda pendentes** — não publicar sem isso |

## 11. Identidade visual e design system

| Item | Status |
|---|---|
| `design-system-rootora.md` como referência única | ✅ mantido e atualizado |
| Paleta de cores corrigida pra bater com `02-identidade-visual.md` | ✅ confirmado em auditoria (11/set) |
| Fontes (Zilla Slab / IBM Plex Sans / Space Mono) vinculadas nativamente | ✅ confirmado visualmente em device (11/set) |
| Botão secundário/ghost unificado (neutro) + "Excluir conta" sem vermelho | ✅ confirmado em auditoria (11/set) |
| Tab bar — label "Hoje" + cor (ativa Cobre, inativa neutra) | ✅ confirmado em auditoria |

## 12. Polimento geral (splash, loading, etc.)

| Item | Status |
|---|---|
| Splash Screen animada | ✅ |
| Loading Indicator (fullscreen/inline) | ✅ |
| Estados vazios com identidade (`EmptyState`) | ✅ |
| Toast de erro de rede/escrita | ✅ |
| Bloqueio do botão voltar (recaída/retorno) | ✅ confirmado em auditoria (11/set) |
| Pull-to-refresh (Home/Progresso) | ✅ confirmado em auditoria (11/set) |

## 13. Monetização

| Item | Status |
|---|---|
| Modelo definido: assinatura, app inteiro, 7 dias grátis, verificação via Cloud Function | ✅ decisão tomada |
| Produto no Google Play Console | 📋 (`procedimento-loja.md`) |
| Migração pra plano Blaze + Cloud Functions + RTDN | 📋 (`procedimento-loja.md`) |
| Fluxo de compra no app (`react-native-iap`) + paywall | 📋 (`procedimento-loja.md`) |

## 14. Pendente de decisão (não atacar sem definir escopo antes)

- XP e níveis — risco de métrica vazia identificado, aguardando decisão de formato
- Micro-reflexão pós-recaída
- Conteúdo bíblico (toggle)
- Seleção de tema visual (Amanhecer/Raiz/Maré)

## 15. Publicação (fora do código, `procedimento-loja.md`)

- Conta de desenvolvedor Google Play
- Ficha da app na loja (inclui justificativa de Accessibility Service)
- Tudo do item 13 acima

---

## Próximo passo recomendado

Antes de abrir mais funcionalidade nova, vale fechar os itens 🚧 desta lista — são
coisas que já têm prompt gerado mas nunca voltaram com confirmação explícita de teste.
Uma auditoria focada nesses itens específicos (não o design system inteiro de novo) é o
jeito mais rápido de saber onde realmente se está.
