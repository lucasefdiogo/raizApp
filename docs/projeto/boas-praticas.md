# Boas Práticas — Rootora

> Convenções de código, testes, commits, Definição de Pronto e estilo de trabalho do Lucas.

## Estrutura de pastas e separação de camadas

```
src/
├── screens/       # Orquestram hooks + componentes, quase zero lógica própria
├── components/    # "Burros" — só recebem props, nunca chamam Firebase direto
├── hooks/         # Lógica de negócio (useStreak, useDailyTasks, useRegrasBloqueio...)
├── domain/        # Funções puras (streak.ts, progress.ts, appBlock.ts, intercept.ts...)
│                  # sem import de React/Firebase — as mais fáceis e importantes de testar
├── services/      # Única camada que fala com Firebase (firestore.ts, auth.ts...)
├── native/        # Wrappers TS sobre módulos nativos Android (AccessibilityDetection.ts)
├── theme/         # colors.ts, typography.ts
├── navigation/    # React Navigation
└── utils/         # Helpers genéricos
```

**Regra-chave:** `components/`/`screens/` nunca importam `services/` direto — só via `hooks/`.
`domain/` nunca importa React/Firebase/AsyncStorage. Regra de negócio nova vive em `domain/`,
não espalhada em componente/hook, e precisa de teste — sem desculpa para deixar sem teste
(lógica pura é a mais fácil de testar).

## Convenções de código

- TypeScript estrito, sem `any` implícito
- Componentes em `PascalCase`, hooks em `useCamelCase`
- Nomes de campo no Firestore em `camelCase`, em português (`streakAtual`,
  `escudosDisponiveis` — nome interno continua "escudo"; texto ao usuário é "proteção")
- Nenhuma cor ou fonte hardcoded fora de `theme/`
- Nenhum texto de UI com ponto de exclamação, tom de cobrança, ou pedido de desculpas (ver
  "Regras de texto" em `spec.md`)

## Testes

- Toda funcionalidade nova precisa de testes automatizados, cobrindo especialmente `domain/`
  (lógica pura) e componentes com comportamento condicional
- `npm test` deve passar antes de finalizar qualquer tarefa
- Testes Kotlin (`SaldoBloqueioMaquina.kt` etc.) rodam fora do `npm test`:
  `cd android && ./gradlew :app:testDebugUnitTest`
- Teste novo **não** leva prefixo `CA-nn:` no nome nem referencia HU/CA de forma alguma (nome,
  comentário ou `describe`) — o nome descreve o comportamento testado. Testes antigos com
  `CA-nn:` vêm de HUs arquivadas e não devem ser renomeados em massa
- Relatório de testes JS em `reports/junit/*.xml` (ignorado pelo git, reporter `jest-junit`)

## Lint, tipos e formatação

```bash
npm run lint         # ESLint
npx tsc --noEmit      # checagem de tipos
npx prettier --write . # Prettier 2.8.8
```

## Commits e branches

- **Toda funcionalidade/fix começa em branch própria** (`feature/`, `fix/`, `chore/`,
  `docs/`), nunca commit direto na `main`
- Commits: `tipo: descrição curta` (`feat:`, `fix:`, `chore:`, `docs:`), em português

## Dívida técnica registrada

| Item | Estado | Migração planejada |
|---|---|---|
| Cálculo de streak/escudo | Roda no client, ao abrir o app | Cloud Function agendada, quando a base crescer |
| `streakAtual`/`escudosDisponiveis` | Graváveis diretamente pelo client | Endurecer regras (só Cloud Function admin escreve) antes de escalar |
| Exclusão de conta | Client-side, sem exclusão recursiva via Admin SDK | Cloud Function, mesmo racional do item acima |
| Regra do saldo de blocos duplicada (Kotlin + TS) | Mantidas iguais só pelas fixtures compartilhadas | Aceito — o Service não tem JS |
| Testes Kotlin | Fora do CI | Incluir quando houver CI |
| Política de Privacidade / Termos de Uso | Minuta revisada internamente | Revisão jurídica formal (OAB) antes de escalar a base ou lançar assinatura |

Ao editar `firestore.rules` ou campos de streak/assinatura, revisar esta seção antes.

## Estilo de trabalho preferido (Lucas)

- Português do Brasil em tudo; código, nomes e comentários em inglês
- Ao propor mudança de mecânica, funcionalidade ou texto novo, mostrar o racional ou rascunho
  antes de gerar o arquivo final e esperar validação
- Perguntar antes de assumir escopo quando não estiver claro
- Preferir tabelas e estrutura clara em specs técnicas
- Ao sugerir gamificação, avaliar explicitamente o risco de "métrica vazia"
- Em decisões com trade-off relevante, apresentar prós e contras antes de recomendar
- Propor e validar novas dependências com o Lucas antes de instalar — nunca decidir sozinho
- Se uma mudança deixar algum documento de `docs/projeto/` desatualizado, sinalizar isso no
  resumo final da tarefa

## Definição de Pronto (checklist antes de finalizar qualquer tarefa)

- [ ] Código em branch própria, nada direto na `main`
- [ ] Regra de negócio nova vive em `domain/`, não espalhada em componente/hook
- [ ] Nenhuma cor/fonte hardcoded fora de `theme/`
- [ ] Testes automatizados cobrindo a lógica nova, `npm test` passando
- [ ] `npm run lint` sem erros novos
- [ ] Nenhum dos 5 princípios do produto violado (ver `spec.md`)
- [ ] Se mexeu em dado sensível (streak, assinatura, `firestore.rules`): dívida técnica
      relevante mencionada
- [ ] Se o código divergiu de algo documentado em `docs/projeto/`: sinalizado no resumo

## Acessibilidade

Não é opcional: rótulos, foco, contraste e tamanho de toque em qualquer componente novo.

## Observabilidade

- Firebase Analytics: eventos custom de produto — wrapper `src/services/analytics.ts`, uma
  função por evento
- Firebase Crashlytics: `registrarErro` manual nos catches existentes de `hooks/` — wrapper
  `src/services/crashlytics.ts`
