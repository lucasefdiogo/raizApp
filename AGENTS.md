# Repository Guidelines

## Contexto e fonte de verdade

Rootora é um app mobile Android em React Native CLI, TypeScript e Firebase para reduzir procrastinação e uso problemático do celular. O produto está em teste fechado na Play Store; o trabalho atual é corrigir bugs e fazer construções pontuais. Responda sempre em português do Brasil.

Antes de mudar código, consulte o documento pertinente em `docs/projeto/`:

| Documento                           | Consulte para                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| `regras-de-negocio.md`              | Regras do app, textos exatos da UI, privacidade, Analytics e decisões pendentes (§14). |
| `spec.md`                           | Produto, público, princípios, LGPD, Play Store e assinatura.                           |
| `arquitetura.md`                    | Camadas, serviços, dependências, comandos e dívida técnica.                            |
| `schema.md`                         | Coleções e campos do Firestore, regras de segurança e uso por tela.                    |
| `boas-praticas.md`                  | Convenções, testes, commits e Definição de Pronto.                                     |
| `design-system.md` e `prototipo.md` | Tokens, componentes, protótipos e telas reais.                                         |

`docs/adr/` registra decisões de arquitetura; `docs/legal/` contém os textos legais. O código em `src/screens/` e `src/navigation/` é a referência da composição real das telas. Se uma alteração mudar regra, texto, campo do Firestore, componente ou tela, atualize o documento correspondente em `docs/projeto/` no mesmo branch. Mudanças na coleta de dados podem exigir atualização dos textos legais.

## Princípios de produto

1. Reduza a ameaça percebida da tarefa; não aumente cobrança ou pressão.
2. Não prometa “resetar o cérebro” nem “esvaziar dopamina”.
3. Trate recaídas sem vergonha: fricção pode existir, punição não.
4. Favoreça pequenas vitórias e autoeficácia; questione gamificação vazia.
5. Reapresente o “porquê” pessoal nas telas de recaída e retorno.

Se um pedido contrariar esses princípios ou `regras-de-negocio.md`, aponte o conflito antes de implementar.

## Fluxo de trabalho no Codex

Use as skills do plugin Superpowers instalado no Codex. Para bugs: `systematic-debugging` → `test-driven-development` (primeiro um teste que reproduza a falha) → correção mínima → `verification-before-completion` → `finishing-a-development-branch`. Para construções pontuais ou mudanças de regra: `brainstorming` → `writing-plans` → `executing-plans` ou `subagent-driven-development`, com `test-driven-development` → `requesting-code-review` → `finishing-a-development-branch`. Parta de `regras-de-negocio.md` e não pergunte o que a documentação já responde. Combine mudanças pequenas no chat; registre specs e planos maiores em `docs/superpowers/specs/` e `docs/superpowers/plans/`. Esses arquivos são registros de trabalho; regras válidas devem constar em `docs/projeto/`. Antes de mudar mecânica, regra ou texto, apresente o racional ou rascunho para validação de Lucas. Proponha novas dependências e aguarde aprovação antes de instalá-las.

Trabalhe em branch normal no mesmo checkout (`fix/`, `feature/`, `chore/`, `docs/`); não use worktrees nem faça commit direto na `main`. Após testes, lint e tipos, faça merge local `--no-ff` na `main`, sem PR. Só envie commits ao remoto com confirmação explícita de Lucas. Registre pendências técnicas em `TODO.md` e decisões de produto pendentes em `regras-de-negocio.md` §14.

## Estrutura e arquitetura

`src/screens/` orquestra telas; `src/components/` recebe props sem acessar Firebase; `src/hooks/` coordena a lógica; `src/domain/` contém regras puras, sem React, Firebase ou AsyncStorage; `src/services/` é a única camada que conversa com Firebase; `src/native/` envolve módulos Android; `src/theme/` centraliza cores e fontes; `src/navigation/` define os fluxos. Screens e components só acessam services por hooks. Código nativo e testes Kotlin ficam em `android/`; recursos iOS em `ios/`; testes Jest ficam próximos ao código como `*.test.ts` ou `*.test.tsx`.

`RootNavigator` é um Stack único; a interceptação de apps usa o root RN separado `Intercept` e a `InterceptActivity`. `SaldoBloqueioMaquina.kt` é a autoridade do motor de sessões; mantenha `src/domain/saldoBloqueio.ts` e as fixtures equivalentes. `regrasBloqueio` é espelhado em SharedPreferences para uso pelo Kotlin com o app fechado. Notificações são locais com Notifee, não FCM. Ao alterar `firestore.rules`, streak ou assinatura, revise a dívida técnica em `docs/projeto/arquitetura.md`.

## Comandos e verificação

Use Node.js 22.11 ou mais recente e `npm ci` para instalar dependências. Execute `npm start` para Metro e `npm run android` para compilar e instalar pelo terminal WSL, sem usar o sync do Android Studio. `npm run ios` exige CocoaPods configurado. Rode `npm test` (Jest), `npm run lint` (ESLint) e `npx tsc --noEmit` antes de finalizar. Para mudanças Kotlin, execute `cd android && ./gradlew :app:testDebugUnitTest`; esses testes não rodam no Jest. Código que toca Kotlin, notificações ou Accessibility Service só fica validado após teste em aparelho físico; se isso não for possível, informe no resumo final.

## Estilo, testes e conclusão

Siga `.eslintrc.js` e `.prettierrc.js`: indentação de dois espaços em TS/TSX, aspas simples e vírgulas finais. Use TypeScript estrito, componentes `PascalCase`, hooks `useCamelCase` e campos do Firestore em português `camelCase`, como `streakAtual`. No código o termo é “escudo”; na UI, “proteção”, apenas para streak. Não codifique cores ou fontes fora de `src/theme/`. A UI não usa exclamações, cobrança nem pedidos de desculpas; confira a copy em `regras-de-negocio.md`.

Toda funcionalidade nova precisa de testes, sobretudo regras em `domain/` e componentes condicionais. Dê aos testes novos nomes que descrevam o comportamento; não use prefixos legados `CA-nn` ou `HU-nn` nem renomeie os antigos em massa. Antes de concluir, confirme os cinco princípios, documentação atualizada, testes, lint, tipos e, quando aplicável, Gradle e aparelho físico. Use mensagens de commit curtas em português, como `feat: adiciona fluxo`, `fix: corrige navegação`, `docs: atualiza regra` ou `test: cobre retorno`.
