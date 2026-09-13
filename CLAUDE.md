# CLAUDE.md — Projeto Rootora

Contexto persistente para o Claude Code neste repositório. Leia isto antes de qualquer
alteração de código.

## O que é o projeto

App mobile **Rootora** (Android, React Native CLI bare workflow + TypeScript) para
combater procrastinação e uso problemático de smartphone via streak com sistema de
proteção (perdão), tarefas fatiadas, recaída sem culpa, e bloqueio de apps como
diferencial competitivo.

## Documentação detalhada — pasta `/definition`

Este arquivo é deliberadamente enxuto. Antes de qualquer decisão de escopo, regra de
negócio, cor, componente ou dado do Firestore, **consultar `/definition`**:

| Arquivo | Quando consultar |
|---|---|
| `roadmap-e-status.md` | O que já existe, o que está em andamento, o que é planejado — sempre checar antes de assumir que algo não foi feito |
| `regras-de-negocio.md` | Streak/proteção, desafios, bloqueio de apps — mecânica e textos exatos |
| `schema-firebase.md` | Toda a estrutura de dados do Firestore, campos, regras de segurança |
| `navegacao-componentes.md` | Árvore de navegação real e composição de cada tela |
| `design-system-rootora.md` | Tokens de cor, tipografia, biblioteca de componentes com caminho de arquivo |
| `02-identidade-visual.md` | Conceito de marca — fonte de verdade dos hex (design-system-rootora.md documenta a implementação, este documenta a intenção) |
| `stack-tecnico.md` | Bibliotecas, ambiente de dev, dívida técnica |
| `procedimento-loja.md` | Publicação, assinatura — nada disso é escopo de código ainda |
| `00-instrucoes-do-projeto.md` | Estilo de trabalho preferido do Lucas |

`03-mvp.md`, `04-fase2.md`, `05-fase3.md` e `regras-streak-e-textos-mvp.md` foram
**aposentados** — não existem mais / não devem ser recriados. O projeto não é mais
organizado por fase burocrática (MVP/Fase2/Fase3); é organizado por domínio funcional,
refletido em `roadmap-e-status.md`.

## Princípios inegociáveis (aplicam-se a QUALQUER código, texto ou mecânica nova)

1. Reduzir a ameaça percebida da tarefa — nunca aumentar cobrança/pressão
2. Nunca prometer "resetar o cérebro" ou "esvaziar dopamina" em copy ou nomes de feature
3. Recaída sem vergonha — nenhuma mensagem de erro/estado vazio pode soar punitiva;
   fricção crescente é aceitável (ex: escalação do bloqueio de apps), punição não
4. Autoeficácia por acúmulo de pequenas vitórias — desconfiar de gamificação vazia
5. O "porquê" pessoal do usuário deve poder ser reexibido em telas de recaída/retorno

Se uma tarefa pedir algo que contradiga isso, apontar o conflito antes de implementar.

## Arquitetura real (corrigida após auditoria — não é o que documentos antigos descrevem)

```
RootNavigator (Stack.Navigator ÚNICO, não stacks separados por arquivo)
├── Splash → Tutorial → Auth (SignIn/SignUp/ForgotPassword) → Onboarding → Main
├── Onboarding é 1 tela com máquina de passos interna (Foco→TempoTela→Porque→PrimeiraTarefa)
│     gate de saída: users/{uid}.onboardingConcluido (não porqueTexto)
├── Main → MainTabNavigator (Hoje / Progresso / Perfil)
└── AppBlockedScreen — overlay do RootNavigator, fora de qualquer stack/tab
```
Detalhe completo em `navegacao-componentes.md`.

## Separação de camadas

```
src/
├── screens/       # Orquestram hooks + componentes, quase zero lógica própria
├── components/    # "Burros" — só recebem props, nunca chamam Firebase direto
├── hooks/         # Lógica de negócio (useStreak, useDailyTasks, useAppBlocking...)
├── domain/        # Funções puras (streak.ts, progress.ts, appBlockEscalation.ts...)
│                  # sem import de React/Firebase — as mais fáceis e importantes de testar
├── services/      # Única camada que fala com Firebase (firestore.ts, auth.ts...)
├── native/        # Wrappers TS sobre módulos nativos Android (AccessibilityDetection.ts)
├── theme/         # colors.ts, typography.ts — ver design-system-rootora.md pros tokens
├── navigation/    # React Navigation
└── utils/         # Helpers genéricos
```

Regra-chave: `components/`/`screens/` nunca importam `services/` direto — só via
`hooks/`. `domain/` nunca importa React/Firebase/AsyncStorage.

## Tema e ícone

Tema único (Raiz) no MVP. Seleção de tema (Amanhecer/Raiz/Maré) é Fase 2 — ver
`roadmap-e-status.md`. Ícone do app é genérico, paleta própria, não segue tema (ver
`design-system-rootora.md` seção 1).

## Notificações

MVP usa **notificação local** (`@notifee/react-native`), não FCM — lembrete diário e
alerta de risco de streak dependem de horário/estado local, não de evento de servidor.
FCM fica reservado pra Fase 2 (reengajamento via Cloud Function).

## Comandos

```bash
npm start                 # Metro bundler
npm run android            # build + instala no emulador/dispositivo
npm run lint                # ESLint
npm test                    # Jest
```

Gradle/build sempre via terminal WSL (`npx react-native run-android`), nunca pelo botão
de sync do Android Studio — ver `stack-tecnico.md` pro motivo.

## Convenções de código

- TypeScript estrito, sem `any` implícito
- Componentes em `PascalCase`, hooks em `useCamelCase`
- Nomes de campo no Firestore em `camelCase`, em português (`streakAtual`,
  `escudosDisponiveis` — nome interno continua "escudo", texto ao usuário é
  "proteção", ver `regras-de-negocio.md`)
- Nenhum texto de UI com ponto de exclamação, tom de cobrança, ou pedido de desculpas
- Commits: `tipo: descrição curta` (`feat:`, `fix:`, `chore:`, `docs:`), em português
- Novas dependências: propor e validar com o Lucas antes de instalar, não decidir sozinho

## Fluxo de trabalho preferido

- Mostrar o racional antes de codar mudança de mecânica ou funcionalidade nova
- Perguntar antes de assumir escopo quando não estiver claro
- **Toda funcionalidade/fix começa em branch própria** (`feature/`, `fix/`, `chore/`),
  nunca commit direto na `main`
- **Toda funcionalidade nova precisa de testes automatizados** — cobrir especialmente
  `domain/` (lógica pura, sem desculpa pra deixar sem teste) e componentes com
  comportamento condicional. Rodar `npm test` antes de finalizar
- Ao editar `firestore.rules` ou campos de streak/assinatura, checar dívida técnica em
  `stack-tecnico.md`
- Se um documento em `/definition` ficar desatualizado por uma mudança feita, sinalizar
  isso no resumo final da tarefa — não deixar a documentação divergir do código de novo

## Definição de Pronto (checklist antes de finalizar qualquer tarefa)

- [ ] Código em branch própria, nada direto na `main`
- [ ] Regra de negócio nova vive em `domain/`, não espalhada em componente/hook
- [ ] Nenhuma cor/fonte hardcoded fora de `theme/`
- [ ] Testes automatizados cobrindo a lógica nova, `npm test` passando
- [ ] `npm run lint` sem erros novos
- [ ] Nenhum dos 5 princípios do produto violado
- [ ] Se mexeu em dado sensível (streak, assinatura, firestore.rules): dívida técnica
      relevante mencionada
- [ ] Se o código divergiu de algo documentado em `/definition`: sinalizado no resumo
