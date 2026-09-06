# CLAUDE.md — Projeto Raiz

Contexto persistente para o Claude Code neste repositório. Leia isto antes de qualquer alteração de código.

## O que é o projeto

App mobile (nome interno **Raiz**, nome comercial ainda não definido) para combater procrastinação e uso
problemático de smartphone via streak com sistema de perdão (escudo), tarefas fatiadas e recaída sem culpa.
Fundamentação teórica completa em `fundamentacaoteoricaprojeto.pdf` — não reabrir decisões de produto sem
pedido explícito do Lucas.

## Princípios inegociáveis (aplicam-se a QUALQUER código, texto ou mecânica nova)

1. Reduzir a ameaça percebida da tarefa — nunca aumentar cobrança/pressão
2. Nunca prometer "resetar o cérebro" ou "esvaziar dopamina" em copy ou nomes de feature
3. Recaída sem vergonha — nenhuma mensagem de erro/estado vazio pode soar punitiva
4. Autoeficácia por acúmulo de pequenas vitórias — desconfiar de gamificação vazia (XP sem significado real)
5. O "porquê" pessoal do usuário deve poder ser reexibido em telas de recaída/retorno

Se uma tarefa pedir algo que contradiga isso (ex: "adiciona um ranking entre usuários", "zera o streak
totalmente"), apontar o conflito antes de implementar.

## Stack e decisões técnicas fechadas

| Área | Decisão | Não mudar sem pedido explícito |
|---|---|---|
| Mobile | React Native CLI, **bare workflow** (não Expo) | ✅ |
| Plataforma inicial | Android apenas | ✅ |
| Backend | Firebase via `@react-native-firebase` (nativo, não SDK web) | ✅ |
| Navegação | `@react-navigation` (native-stack + bottom-tabs) | ✅ |
| Estado local leve | `@react-native-async-storage/async-storage` | ✅ |
| Animações | `react-native-reanimated` | ✅ |
| Ambiente de build | WSL2 Ubuntu-22.04 (JDK 17, Gradle) + Android Studio no Windows para SDK/emulador | ✅ |

**Novas dependências:** não instalar biblioteca nova (gerenciamento de estado, UI kit, etc.) para "resolver"
um problema sem antes propor e validar com o Lucas — o stack acima é decisão fechada, adicionar algo por
conta própria é a forma mais comum de gerar dívida técnica não registrada.

## Arquitetura — separação de camadas

Layout/UI e regra de negócio vivem em lugares diferentes e não se misturam:

```
src/
├── screens/       # Telas — orquestram hooks + componentes, quase zero lógica própria
├── components/    # Componentes "burros" — só recebem props, nunca chamam Firebase direto
├── hooks/         # Lógica de negócio em hooks (useStreak, useDailyTasks, useEscudo...)
├── domain/        # Funções puras de regra de negócio (calcularQuedaStreak, avaliarDiaCumprido...)
│                  # sem import de React/Firebase — são as mais fáceis e importantes de testar
├── services/      # Única camada que fala com Firebase (firestore.ts, auth.ts, messaging.ts)
├── theme/         # Ver seção "Tema e paleta" abaixo
├── navigation/    # React Navigation stacks/tabs
└── utils/         # Helpers genéricos (datas, formatação)
```

Regra-chave: `components/` e `screens/` nunca importam nada de `services/` diretamente — só passam por
`hooks/`. `domain/` nunca importa nada de React/Firebase.

## Tema e paleta — sempre centralizados

Nenhuma cor, fonte ou espaçamento hardcoded direto em componentes. Fonte única da verdade:

```
src/theme/
├── colors.ts      # todos os hex — hoje reflete a paleta Raiz (Terra Escura, Cobre, Musgo, Areia)
├── typography.ts  # Zilla Slab / IBM Plex Sans / Space Mono
├── spacing.ts
└── index.ts       # exporta um objeto `theme` único
```

Componentes usam `theme.colors.accent`, nunca o hex direto. A identidade visual ainda pode mudar
(paleta/tipografia foram testadas em 3 variações — Amanhecer, Raiz, Maré) — trocar deve significar editar
só esses arquivos, sem tocar em componente nenhum.

## Estrutura de dados (Firestore) — resumo

```
users/{userId}
  streak: { streakAtual, diasTotaisAtivos, escudosDisponiveis, marcosAtingidos, ultimoDiaAtivo, statusStreak }
  onboarding: { porqueTexto, focoProcrastinacao, tempoTelaEstimado }
  └── dailyLogs/{YYYY-MM-DD}: { tarefas[], statusDia, escudoUsado }

phrases/{phraseId}          — banco global de frases (não editar client-side)
systemMessages/{messageKey} — textos versionáveis (marcos, recaída, retorno)
```
Regras de streak: dia cumprido = ≥1 tarefa essencial (ou 60% das tarefas); sem escudo, 1 dia perdido reduz
o streak para 50% (nunca zera); 2+ dias seguidos reinicia em 1 (mas `diasTotaisAtivos` nunca reseta).
Se o schema do Firestore mudar, atualizar também o documento `schema-firebase-mvp.md` do projeto — não
deixar os dois divergirem.

## Dívida técnica registrada — lembrar sempre que tocar nessas áreas

- **Cálculo de status diário roda no client**, não em Cloud Functions agendadas. Migração planejada para
  quando a base de usuários crescer. Não "corrigir" isso silenciosamente sem avisar — é uma escolha
  consciente de MVP.
- **`streakAtual` e `escudosDisponiveis` são graváveis diretamente pelo client** nas regras atuais do
  Firestore (ver `firestore.rules`). Antes de escalar a base de usuários, endurecer para que só Cloud
  Functions com privilégio admin escrevam esses campos. Se for mexer em `firestore.rules`, mencionar esse
  ponto mesmo que não seja o objetivo da tarefa.

## Comandos

```bash
npm start                 # Metro bundler
npm run android            # build + instala no emulador/dispositivo Android
npm run lint                # ESLint
npm test                    # Jest
```
> Ajustar esta lista se os scripts reais do `package.json` divergirem — confirmar antes de assumir.

## Convenções de código

- Componentes em `PascalCase`, hooks em `useCamelCase`
- Nomes de campo no Firestore em `camelCase`, em português quando já usados nos schemas (`streakAtual`,
  `escudosDisponiveis`, `porqueTexto`) — manter consistência com o schema já definido, não traduzir
- Nenhum texto de UI com ponto de exclamação, tom de cobrança, ou pedido de desculpas em nome do usuário
  (ver banco de frases e regras de copy nos docs do projeto)
- Commits: `tipo: descrição curta` (`feat:`, `fix:`, `chore:`, `docs:`) — mensagens em português

## Fluxo de trabalho preferido

- Ao propor uma funcionalidade ou mudança de mecânica nova, mostrar o racional antes de codar
- Perguntar antes de assumir escopo entre MVP / Fase 2 / Fase 3 quando não estiver claro
- Ao editar `firestore.rules` ou qualquer campo de streak, citar a dívida técnica relevante acima
- Não versionar `android/app/google-services.json` nem `ios/GoogleService-Info.plist` (já no `.gitignore`)
- **Toda funcionalidade nova (ou fix relevante) começa em uma branch própria** — nunca commitar direto na
  `main`. Convenção de nome: `feature/nome-curto`, `fix/nome-curto`, `chore/nome-curto`. Criar a branch antes
  do primeiro commit da tarefa:
  ```bash
  git checkout -b feature/nome-da-funcionalidade
  ```
- **Toda funcionalidade nova precisa vir acompanhada de testes automatizados** — não considerar a tarefa
  concluída sem eles. Cobrir pelo menos:
  - Lógica de regras de negócio em `domain/` (ex: cálculo de streak, queda para 50%, ativação de escudo) —
    prioridade alta por ser a lógica mais sensível do produto, e a mais fácil de testar por ser pura
  - Componentes com comportamento condicional (ex: `<RecoveryStateCard />` mudando de texto por `tipo`)
  - Funções puras de formatação/validação em `utils/`
  - Se a funcionalidade mexer em Cloud Functions, testar com o emulador do Firebase antes de considerar pronta
  - Rodar `npm test` antes de abrir o PR/finalizar a branch; não deixar teste quebrado para "depois"

## Definição de Pronto (checklist rápido antes de finalizar qualquer tarefa)

- [ ] Código em branch própria (`feature/`, `fix/` ou `chore/`), nada direto na `main`
- [ ] Regra de negócio nova vive em `domain/`, não espalhada em componente/hook
- [ ] Nenhuma cor/fonte hardcoded fora de `theme/`
- [ ] Testes automatizados cobrindo a lógica nova, `npm test` passando
- [ ] `npm run lint` sem erros novos
- [ ] Nenhum dos 5 princípios do produto violado (ver seção acima)
- [ ] Se mexeu em `firestore.rules` ou campos de streak: dívida técnica relevante mencionada
- [ ] Se mexeu no schema do Firestore: `schema-firebase-mvp.md` atualizado
