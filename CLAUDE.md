# CLAUDE.md — Rootora

App mobile **Rootora** (Android, React Native CLI bare workflow + TypeScript + Firebase) contra
procrastinação e uso problemático do celular: tarefas fatiadas, streak com proteção (perdão),
recaída sem culpa e bloqueio de apps com sessões, válvulas de escape e rotina noturna.

O produto está construído e em teste fechado na Play Store. O trabalho daqui em diante é
**correção de bugs e construções pontuais**. Responder sempre em português do Brasil.

## Fonte de verdade — `docs/projeto/`

Ler o arquivo relevante **antes** de mudar código. Não existe outra pasta de especificação.

| Arquivo | Quando consultar |
|---|---|
| `docs/projeto/regras-de-negocio.md` | **Toda regra de negócio do app**, textos exatos de UI, privacidade/Analytics e pendências em aberto (§13) |
| `docs/projeto/spec.md` | O que é o produto, público, princípios, decisões já tomadas, restrições (LGPD, Play Store), loja e assinatura |
| `docs/projeto/arquitetura.md` | Stack, camadas, comandos, serviços, dependências, estrutura de pastas, dívida técnica |
| `docs/projeto/schema.md` | Coleções e campos do Firestore, regras de segurança, mapeamento telas → coleções |
| `docs/projeto/boas-praticas.md` | Convenções de código, testes, commits, Definição de Pronto, estilo de trabalho do Lucas |
| `docs/projeto/design-system.md` | Tokens de cor, tipografia e componentes (com caminho de arquivo) |
| `docs/projeto/prototipo.md` | Protótipos HTML em `docs/design/prototipo/` e lista de telas reais |
| `docs/adr/` · `docs/legal/` | Decisões de arquitetura · Política de Privacidade e Termos (atualizar se a coleta de dados mudar) |

O código é a referência para composição de telas e navegação (`src/screens/`, `src/navigation/`).

**Regra de manutenção:** se uma mudança altera regra, texto exibido, campo do Firestore,
componente ou tela, o arquivo correspondente de `docs/projeto/` é atualizado **no mesmo
branch**, antes do merge. Documentação nunca fica divergente do código.

## Princípios inegociáveis

1. Reduzir a ameaça percebida da tarefa — nunca aumentar cobrança/pressão
2. Nunca prometer "resetar o cérebro" ou "esvaziar dopamina"
3. Recaída sem vergonha — fricção é aceitável (ex.: pré-compromisso do bloqueio), punição não
4. Autoeficácia por pequenas vitórias — desconfiar de gamificação vazia
5. O "porquê" pessoal reaparece em telas de recaída/retorno

Se um pedido contradiz isso ou `regras-de-negocio.md`, apontar o conflito antes de implementar.

## Fluxo de trabalho com superpowers

**Bug:** `systematic-debugging` (achar a causa raiz, sem chute) → `test-driven-development`
(primeiro um teste que reproduz o bug e falha) → correção mínima →
`verification-before-completion` → `finishing-a-development-branch`.

**Construção pontual / mudança de regra:** `brainstorming` → `writing-plans` →
`executing-plans` (ou `subagent-driven-development`) com `test-driven-development` →
`requesting-code-review` → `finishing-a-development-branch`.
- No brainstorming, partir de `regras-de-negocio.md` e não perguntar o que ele já responde.
  Mudança pequena se combina no chat; spec escrita só quando a mudança for maior.
- Specs e planos ficam nos caminhos padrão do superpowers (`docs/superpowers/specs/`,
  `docs/superpowers/plans/`). São registro de trabalho, não fonte de verdade: o que valer como
  regra é levado para `docs/projeto/regras-de-negocio.md` no mesmo branch.
- Mostrar o racional/plano e esperar o ok do Lucas antes de mudar mecânica, regra ou texto.

**Preferências que ajustam os skills:**
- **Sem git worktree.** Ambiente WSL2 + Android/Gradle: trabalhar em branch normal no mesmo
  checkout (`fix/nome`, `feature/nome`, `chore/nome`, `docs/nome`). Nunca commit direto na `main`.
- **Fechamento do branch:** testes, lint e tipos passando → merge local `--no-ff` na `main`.
  Sem PR. **Push para o remoto só com confirmação explícita do Lucas** — nunca automático.
- **Dependência nova:** propor e esperar aprovação antes de instalar.

## Arquitetura — o essencial

```
src/
├── screens/     orquestram hooks + componentes, quase sem lógica
├── components/  "burros": só props, nunca chamam Firebase
├── hooks/       lógica de negócio (useStreak, useDailyTasks, useRegrasBloqueio...)
├── domain/      funções puras, sem React/Firebase/AsyncStorage — onde vive a regra e o teste
├── services/    única camada que fala com Firebase
├── native/      wrappers TS de módulos Android (Kotlin)
├── theme/       colors.ts, typography.ts — nenhuma cor/fonte fora daqui
└── navigation/
```

- `components/` e `screens/` nunca importam `services/` direto — só via `hooks/`.
- `RootNavigator` é um Stack único; a interceptação de apps é um root RN separado (`'Intercept'`,
  `InterceptActivity` nativa), fora dele.
- Motor de sessões: autoridade em `SaldoBloqueioMaquina.kt`, cópia em `domain/saldoBloqueio.ts`,
  mesmas fixtures — mudou um, muda o outro e as fixtures.
- `regrasBloqueio` vigente é espelhado em SharedPreferences e promovido no Kotlin, mesmo com o
  app fechado. Notificações são locais (`@notifee/react-native`), não FCM.
- Ao mexer em `firestore.rules`, streak ou assinatura: checar a dívida técnica em
  `docs/projeto/arquitetura.md`.

## Comandos

```bash
npm start                    # Metro
npm run android              # build + instala (sempre pelo terminal WSL, nunca pelo sync do Android Studio)
npm test                     # Jest
npm run lint                 # ESLint
npx tsc --noEmit             # tipos
cd android && ./gradlew :app:testDebugUnitTest   # testes Kotlin (fora do npm test)
```

Código que toca Kotlin, notificação ou Accessibility Service só é dado como validado depois de
rodar em aparelho físico — dizer isso no resumo final quando não der para validar.

## Definição de Pronto

- [ ] Branch própria, nada direto na `main`
- [ ] Teste escrito antes (bug: teste que reproduzia a falha); regra nova em `domain/` com teste
- [ ] `npm test`, `npm run lint` e `npx tsc --noEmit` sem erros novos (Kotlin: gradle test se mexeu)
- [ ] Nenhuma cor/fonte fora de `theme/`; textos seguem as regras de copy (sem "!", sem cobrança,
      sem desculpas, "proteção" só no streak)
- [ ] Nenhum dos 5 princípios violado
- [ ] `docs/projeto/` atualizado se regra, texto, schema, componente ou tela mudou
- [ ] Merge local `--no-ff` só depois disso; push só com ok do Lucas

## Convenções rápidas

- TypeScript estrito; componentes `PascalCase`, hooks `useCamelCase`.
- Campos do Firestore em `camelCase` e em português (`streakAtual`, `escudosDisponiveis` — no
  código é "escudo", na UI é "proteção").
- Commits `tipo: descrição curta` em português (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- Testes novos descrevem o comportamento no nome. Testes antigos com `CA-nn:` ou `HU-NN ·`
  vêm de HUs já encerradas (a HU de origem aparece nos títulos de `regras-de-negocio.md`) —
  não renomear em massa.
- Pendência que não for resolvida na tarefa vai para `TODO.md` ou para
  `regras-de-negocio.md` §13 (se for decisão de produto).
