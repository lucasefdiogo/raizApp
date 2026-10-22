# CLAUDE.md — Projeto Rootora

Contexto persistente para o Claude Code neste repositório. Leia isto antes de qualquer
alteração de código.

## O que é o projeto

App mobile **Rootora** (Android, React Native CLI bare workflow + TypeScript) para
combater procrastinação e uso problemático de smartphone via streak com sistema de
proteção (perdão), tarefas fatiadas, recaída sem culpa, e bloqueio de apps como
diferencial competitivo.

## Documentação detalhada — pasta `docs/projeto/`

Este arquivo é deliberadamente enxuto. Antes de qualquer decisão de escopo, regra de
negócio, cor, componente ou dado do Firestore, **consultar `docs/projeto/`**:

| Arquivo                        | Quando consultar                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `docs/projeto/spec.md`          | O que é o produto, problema, público, princípios, regras de negócio completas, restrições (LGPD, loja) |
| `docs/projeto/arquitetura.md`   | Tipo de solução, stack, comandos, serviços externos, dependências, estrutura de pastas, ADRs, dívida técnica |
| `docs/projeto/schema.md`        | Toda a estrutura de dados do Firestore, campos, regras de segurança, bancos de conteúdo (frases)        |
| `docs/projeto/boas-praticas.md` | Convenções de código, testes, commits, Definição de Pronto, estilo de trabalho preferido do Lucas       |
| `docs/projeto/design-system.md` | Tokens de cor, tipografia, biblioteca de componentes com caminho de arquivo                             |
| `docs/projeto/prototipo.md`     | Protótipos HTML atuais por tela/estado, lista de telas reais, wireframes históricos (desatualizados)    |

**`docs/projeto/` é a fonte única de verdade** para especificação de produto, arquitetura e
regras de negócio (migração concluída em 2026-10-22). Toda funcionalidade nova ou mudança de
regra entra por uma HU em `docs/hu/` (ver "Fluxo de desenvolvimento — SDD Leve"). Se a HU
mudar regra, schema, componente ou tela, o arquivo correspondente de `docs/projeto/` é
atualizado na mesma branch.

## `/definition` — origem/histórico do conteúdo migrado

`docs/projeto/*.md` foi sintetizado a partir de `/definition`. Os arquivos de `/definition`
continuam existindo e têm o detalhe linha a linha que os resumos de `docs/projeto/` nem sempre
preservam (textos exatos de copy, critérios de aceite completos, tabelas extensas) — consultar
quando o resumo não bastar. Três documentos de `/definition` **não têm arquivo correspondente
em `docs/projeto/`** e continuam sendo a referência direta:

- `roadmap-e-status.md` — o que já existe, está em andamento ou é planejado (tracking de
  status, não é especificação; consultar sempre antes de assumir que algo não foi feito)
- `navegacao-componentes.md` — árvore de navegação real e composição detalhada de cada tela
  (component a component); `docs/projeto/prototipo.md` tem só a lista de telas, não essa
  composição
- `fundamentacaoteoricaprojeto.pdf` — base científica/conceitual com fontes, referenciada mas
  não resumida em `docs/projeto/spec.md`

Os demais arquivos de `/definition` (`01-visao-geral-projeto.md`, `00-instrucoes-do-projeto.md`,
`regras-de-negocio.md`, `09-ponte-fuga-tarefa-e-estou-travado.md`, `procedimento-loja.md`,
`schema-firebase.md`, `banco-de-frases.md`, `banco-de-versiculos.md`, `design-system-rootora.md`,
`02-identidade-visual.md`, `stack-tecnico.md`, `arquitetura.md`) foram incorporados em
`docs/projeto/` e não devem mais ser a primeira consulta — ficam como material de origem.

`03-mvp.md`, `04-fase2.md`, `05-fase3.md` e `regras-streak-e-textos-mvp.md` foram
**aposentados** — não existem mais / não devem ser recriados. O projeto não é mais
organizado por fase burocrática (MVP/Fase2/Fase3); é organizado por domínio funcional,
refletido em `roadmap-e-status.md`.

O formato antigo de HU do lux kit (`/lux-especificar`, `lux importar`, pacotes com
`spec.md`, `criteria.lock`, cenários `.feature` e zips `lux-HU-*`) foi **aposentado** e não
deve ser recriado. O histórico das HU-01 a HU-06 fica em `docs/historico/` (só leitura). As
HUs novas seguem o SDD Leve (seção abaixo) e a numeração continua a partir da HU-07.

## Princípios inegociáveis (aplicam-se a QUALQUER código, texto ou mecânica nova)

1. Reduzir a ameaça percebida da tarefa — nunca aumentar cobrança/pressão
2. Nunca prometer "resetar o cérebro" ou "esvaziar dopamina" em copy ou nomes de feature
3. Recaída sem vergonha — nenhuma mensagem de erro/estado vazio pode soar punitiva;
   fricção é aceitável (ex: regra de pré-compromisso do bloqueio de apps — alteração só vale
   amanhã), punição não
4. Autoeficácia por acúmulo de pequenas vitórias — desconfiar de gamificação vazia
5. O "porquê" pessoal do usuário deve poder ser reexibido em telas de recaída/retorno

Se uma tarefa pedir algo que contradiga isso, apontar o conflito antes de implementar.

## Fluxo de desenvolvimento — SDD Leve

```
lux-hu (claude.ai) → /lux-build (Claude Code) → lux-revisor → merge local → push (com ok)
```

- Funcionalidade nova, mudança de regra ou de tela começa por uma HU gerada pela skill
  `lux-hu` no claude.ai: um arquivo `docs/hu/hu-NN-nome-curto.md` com título, cartão,
  protótipo, regras de negócio (RNnn) e critérios de aceite em Gherkin.
- A HU é a especificação da tarefa — não implementar o que não está nela. Se faltar algo,
  ou se ela conflitar com `docs/projeto/` ou com os 5 princípios, parar e perguntar antes
  de seguir.
- Construção: `/lux-build docs/hu/hu-NN-nome.md --no-e2e`. O `/lux-build` mostra o plano e
  espera o ok, cria a branch `feature/HU-NN-nome`, desenvolve com testes primeiro, roda os
  testes, faz commit e chama o `lux-revisor`. Usar `--no-e2e` até existir um framework de
  E2E escolhido e aprovado (é dependência nova, ver "Convenções de código").
- Depois da aprovação do `lux-revisor`, o `/lux-build` pode fazer o merge local `--no-ff`
  da branch da HU na `main`. **Push para o remoto só com confirmação explícita do Lucas** —
  nunca automático.
- O `lux-revisor` não exige percentual mínimo de cobertura neste projeto: vale a regra de
  testes da Definição de Pronto (lógica nova coberta e cada cenário Gherkin com teste).
- Bug, ajuste de build ou dependência sem mudança de regra não precisa de HU: vai em
  branch `fix/` ou `chore/`, com a mesma Definição de Pronto.
- Pendências que surgirem durante a HU vão para a seção "Pendências" do próprio arquivo da
  HU; o `TODO.md` fica para o que não pertence a nenhuma HU.
- Ao concluir, atualizar o status da HU no `roadmap-e-status.md` e, se a HU mudou regra,
  schema, componente ou tela, o arquivo correspondente de `docs/projeto/`.

## Arquitetura real (corrigida após auditoria — não é o que documentos antigos descrevem)

```
RootNavigator (Stack.Navigator ÚNICO, não stacks separados por arquivo)
├── Splash → Tutorial → Auth (SignIn/SignUp/ForgotPassword) → Onboarding
│     → NotificationPriming (uma vez) → Main
├── Onboarding é 1 tela com máquina de passos interna (Foco→TempoTela→Porque→PrimeiraTarefa)
│     gate de saída: users/{uid}.onboardingConcluido (não porqueTexto)
├── Main → MainTabNavigator (Hoje / Progresso / Perfil)
└── Interceptação de apps bloqueados: root RN separado ('Intercept', InterceptActivity nativa),
    fora do RootNavigator — o AppBlockedScreen antigo foi removido
```

Detalhe completo em `navegacao-componentes.md`.

## Separação de camadas

```
src/
├── screens/       # Orquestram hooks + componentes, quase zero lógica própria
├── components/    # "Burros" — só recebem props, nunca chamam Firebase direto
├── hooks/         # Lógica de negócio (useStreak, useDailyTasks, useRegrasBloqueio...)
├── domain/        # Funções puras (streak.ts, progress.ts, appBlock.ts, intercept.ts...)
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

Tema único (Raiz). Seleção de tema (Amanhecer/Raiz/Maré) está pendente de decisão — ver
`roadmap-e-status.md`. Ícone do app é genérico, paleta própria, não segue tema (ver
`design-system-rootora.md` seção 1).

## Notificações

O app usa **notificação local** (`@notifee/react-native`), não FCM — lembrete diário e
alerta de risco de streak dependem de horário/estado local, não de evento de servidor.
FCM fica reservado para o reengajamento via Cloud Function (planejado, ver
`roadmap-e-status.md`).

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
- Commits: `tipo: descrição curta` (`feat:`, `fix:`, `chore:`, `docs:`), em português —
  vale também para os commits feitos pelo `/lux-build`
- Novas dependências: propor e validar com o Lucas antes de instalar, não decidir sozinho

## Fluxo de trabalho preferido

- Mostrar o racional antes de codar mudança de mecânica ou funcionalidade nova (no
  `/lux-build`, é o plano que ele apresenta antes de começar)
- Perguntar antes de assumir escopo quando não estiver claro
- **Todo trabalho começa em branch própria**: `feature/HU-NN-nome` para HU (criada pelo
  `/lux-build`), `fix/` ou `chore/` para o resto. Nunca commit direto na `main` — a única
  escrita permitida na `main` é o merge `--no-ff` feito pelo `/lux-build` depois da
  aprovação do `lux-revisor`
- **Toda funcionalidade nova precisa de testes automatizados** — cobrir especialmente
  `domain/` (lógica pura, sem desculpa pra deixar sem teste) e componentes com
  comportamento condicional. Rodar `npm test` antes de finalizar
- Ao editar `firestore.rules` ou campos de streak/assinatura, checar dívida técnica em
  `docs/projeto/arquitetura.md`
- Se um documento em `docs/projeto/` ficar desatualizado por uma mudança feita, sinalizar
  isso no resumo final da tarefa — não deixar a documentação divergir do código de novo

## Definição de Pronto (checklist antes de finalizar qualquer tarefa)

- [ ] Código em branch própria, nada direto na `main` (exceto o merge pós-revisor)
- [ ] Se veio de HU: todas as RNs implementadas e cada cenário Gherkin coberto por teste
- [ ] Se veio de HU: `lux-revisor` aprovou
- [ ] Regra de negócio nova vive em `domain/`, não espalhada em componente/hook
- [ ] Nenhuma cor/fonte hardcoded fora de `theme/`
- [ ] Testes automatizados cobrindo a lógica nova, `npm test` passando
- [ ] `npm run lint` sem erros novos
- [ ] `npx tsc --noEmit` sem erros
- [ ] Nenhum dos 5 princípios do produto violado
- [ ] Se mexeu em dado sensível (streak, assinatura, firestore.rules): dívida técnica
      relevante mencionada
- [ ] Se a HU mudou regra, schema, componente ou tela: `docs/projeto/` e
      `roadmap-e-status.md` atualizados
- [ ] Push para o remoto só depois do ok do Lucas

## Verificação

- Instalar: `npm install`. Tipos: `npx tsc --noEmit`.
- Relatório de testes em `reports/junit/*.xml` (ignorado pelo git). O
  `verify.config.json` do lux kit antigo continua no repositório como ferramenta opcional,
  sem uso obrigatório no fluxo.
- Testes de HU nova **identificam a HU e o cenário no nome e na descrição**, para o
  `lux-revisor` ligar cada critério de aceite a um teste:
  `describe('HU-07 · Hoje como alternativa à rolagem', ...)` e
  `it('Cenário 3: concluir a essencial garante o dia', ...)`. Teste que não vem de HU
  (fix/chore, lógica de `domain/` sem cenário) descreve só o comportamento.
- Testes antigos com prefixo `CA-nn:` vêm das HUs arquivadas — não renomear em massa.
