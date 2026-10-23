# Navegação e Componentes — React Native (estado real)

> Documento vivo — reflete a árvore de navegação e os componentes REAIS do código, não
> mais o planejamento original. A divergência mais importante em relação à versão
> anterior: não existem stacks separados por arquivo (`AuthStack.tsx`,
> `OnboardingStack.tsx` etc.) — é **um único `Stack.Navigator`** com todas as rotas de
> topo, e o onboarding é **uma tela com máquina de passos interna**, não 3 rotas.

---

## 1. Árvore de navegação real

```
RootNavigator (Stack.Navigator único — RootStackParamList)
│
├── SplashScreen
│     Exibida no boot, até o maior entre (tempo mínimo 1200ms) e (checagens de
│     tutorial_visto + auth + onboardingConcluido resolvidas).
│
├── Tutorial            (rota única; TutorialScreen com carrossel interno de 4 slides)
│     Mostrada só se AsyncStorage não tiver tutorial_visto === 'true'.
│
├── SignIn / SignUp / ForgotPassword
│     Mostradas se tutorial_visto === 'true' e não há usuário autenticado
│     (nem e-mail/senha nem Google).
│
├── Onboarding          (rota única; OnboardingScreen com máquina de passos interna)
│     Mostrada se autenticado mas users/{uid}.onboardingConcluido !== true.
│     Passos internos, nessa ordem:
│       1. OnboardingStepFoco         (chips de foco de procrastinação)
│       2. OnboardingStepTempoTela    (slider de tempo de tela estimado)
│       3. OnboardingStepPorque       (campo de texto livre — NÃO é mais o gate final)
│       4. OnboardingStepPrimeiraTarefa (campo de tarefa + "Começar"/"Pular por hoje" —
│          É este passo que seta onboardingConcluido = true, não o "porquê")
│
├── NotificationPriming (NotificationPrimingScreen)
│     Mostrada uma vez, se autenticado E onboardingConcluido === true e
│     `useLocalNotifications().deveExibirPriming` — antes de `Main`. Explica a
│     permissão de notificação (POST_NOTIFICATIONS) antes do diálogo nativo.
│
├── Main → MainTabNavigator
│     Mostrada se autenticado E onboardingConcluido === true (e o priming de
│     notificação já resolvido).
│     Abas: Hoje / Progresso / Perfil.
│     tabBarActiveTintColor: theme.colors.accent (= cobre)
│     tabBarInactiveTintColor: theme.colors.terraSuave
│     │
│     ├── HojeStack
│     │     ├── HomeScreen               (rota padrão)
│     │     ├── RecoveryStateScreen      (condicional — statusDia de ontem
│     │     │     protegido_escudo/perdido, ainda não exibido hoje; back físico
│     │     │     bloqueado enquanto em foco)
│     │     ├── ReturnAfterPauseScreen   (condicional — statusStreak === 'pausado';
│     │     │     back físico bloqueado enquanto em foco)
│     │     ├── RotinaConfirmacaoScreen  (condicional — `useRotina.mostrarConfirmacao`:
│     │     │     estimativa calculada (5+ dias de dailyLogs.usoApps com
│     │     │     primeiroUsoDia/ultimoUsoAntesPausaLonga, fora de modoManual) e
│     │     │     rotina.confirmadoEm ainda vazio; "Confirmar" / "Ajustar horário")
│     │     └── AlternativaNoturnaScreen (condicional — `useRotina.perguntarAlternativa`:
│     │           uma única vez, logo depois da confirmação gravar; estado só em
│     │           memória, não volta depois de "Salvar" nem de "Agora não")
│     │
│     │     Todas são rota única do stack (ternário em HojeStack.tsx, sem
│     │     empilhar sobre a Home), nesta prioridade: ReturnAfterPause →
│     │     RecoveryState → RotinaConfirmacao → AlternativaNoturna → Home.
│     │
│     ├── ProgressoStack
│     │     └── ProgressoScreen
│     │
│     └── PerfilStack
│           ├── PerfilScreen
│           ├── BloqueioApps                  (BloqueioAppsScreen — configuração de
│           │     regrasBloqueio: status do serviço, apps (lista curada de redes
│           │     sociais), janela, resumo)
│           ├── RotinaPerfil                  (RotinaPerfilScreen — aberta pelo link
│           │     "Rotina noturna" da seção "Rotina" de PerfilScreen; edição manual
│           │     de dormir/acordar, "Recalcular automaticamente" e alternativa
│           │     noturna)
│           ├── DivulgacaoAcessibilidade      (DivulgacaoAcessibilidadeScreen — aberta
│           │     a partir do botão "Ativar" de BloqueioApps, ANTES das configurações
│           │     de acessibilidade do Android; grava consentimentoAcessibilidade)
│           └── DivulgacaoAcessoUso           (DivulgacaoAcessoUsoScreen — aberta a
│                 partir da entrada "Medir tempo nas redes" de BloqueioApps; grava
│                 consentimentoAcessoUso)
```

### Voltar

- **Telas empurradas** numa stack de aba (`BloqueioApps`, `RotinaPerfil`) e no fluxo
  de auth (`SignUp`, `ForgotPassword`) têm `BackButton` (chevron) no topo. As
  divulgações (`DivulgacaoAcessibilidade`/`DivulgacaoAcessoUso`) não têm: voltam
  pelo "Agora não"/"Entendi", que já são a recusa explícita exigida pela Play Store.
- **Trocar de aba volta a aba de origem pra raiz** (`popToTopOnBlur` no
  `MainTabNavigator`): voltar ao Perfil nunca cai no meio de um fluxo. Tocar de novo
  na aba já ativa também volta pra raiz (padrão do React Navigation).
- **Voltar físico na raiz de Progresso/Perfil** vai pra aba Hoje
  (`useVoltarParaAbaHoje`); na aba Hoje, sai do app.
- **Lembrete "bloqueio desligado"** abre `PerfilTab` → `BloqueioApps` com
  `initial: false`, pra ter o Perfil embaixo mesmo com a aba ainda não montada.

Não existe mais overlay global de bloqueio no `RootNavigator` — o sistema antigo
(`AppBlockedScreen`, disparado por evento nativo por cima de tudo) foi removido por
completo. Hoje a interceptação acontece inteiramente fora da árvore acima, pelo root
`Intercept` descrito a seguir.

### Root separado — `Intercept` (spec `09-ponte-fuga-tarefa-e-estou-travado.md`)

Fora da árvore acima por completo — não é uma rota do `RootNavigator`, é um **segundo
componente registrado no `AppRegistry`** (`index.js`), montado por uma Activity Android
diferente da `MainActivity` (`InterceptRoot.tsx`: `SafeAreaProvider` + `ToastProvider`
próprios, sem `RootNavigator`/`MainTabNavigator`). Pensado pra abrir em <300ms sem
carregar a navegação inteira. **Único caminho de interceptação** —
`regrasBloqueio` → `AccessibilityService.deveInterceptar` → `InterceptActivity`. Não
monta `TravadoFlowScreen` (os chips do TravadoFlow só existem no root principal, via
Home/TaskCard) — monta, no máximo, uma `SessaoFocoScreen` sem tarefa, pelo atalho
neutro do cooldown.

```
InterceptRoot (packageName, appLabel, estadoBloqueioJson, rotinaJson? via initialProps)
└── InterceptScreen — fase da máquina de estados (nativo) decide a tela
      ├── AGUARDANDO_LIBERACAO → PausaIntencaoScreen
      │     (espera pela posição da sessão no dia — 10/20/30/40/50/60s, dobrada e com
      │     mensagem do banco `noturno` se dentro da janela noturna — "Liberar" após a
      │     espera abre a sessão e o app)
      ├── SESSAO_ATIVA → aviso "sessão em andamento" + abre o app direto
      ├── COOLDOWN | SALDO_ZERADO → EsperaBloqueioScreen
      │     ├── "Acesso rápido (2 min)" — se cota/intervalo permitirem (espera 5s, ou
      │     │     30s + mensagem noturna dentro da janela); senão mostra "próximo
      │     │     acesso rápido em X min"
      │     ├── "Saída de emergência" — só quando o acesso rápido não está disponível
      │     │     (respiração guiada de 60s, sem limite de usos)
      │     ├── "Iniciar uma sessão de foco" → SessaoFocoScreen (5 min, sem tarefa,
      │     │     origem 'interceptacao' — não libera o app ao terminar)
      │     └── "Ver tarefas extras" → TarefasExtrasScreen (só relevante com
      │           `blocosDiarios` configurado como número)
      └── (nenhum alvo nesta tela para "Estou travado" — o TravadoFlow com os 4 chips
            só é aberto pela Home/TaskCard, fora deste root)
```

### Lógica de decisão do `RootNavigator`

```
if (!tutorial_visto)              → Tutorial
else if (!user)                   → SignIn (+ SignUp/ForgotPassword acessíveis)
else if (!user.onboardingConcluido) → Onboarding
else if (deveExibirPriming)        → NotificationPriming
else                               → Main
```
Executada uma vez no boot (mais o AsyncStorage do tutorial), com SplashScreen cobrindo
enquanto resolve — nenhuma tela pisca durante o carregamento.

---

## 2. Componentes por tela (visão de composição real)

### HomeScreen
Ordem real de renderização, de cima pra baixo:
1. `HomeHeader` — saudação por horário + nome, badge de streak à direita
2. `StreakCard` — streak atual + escudos disponíveis (prop opcional `hojeCumprido`: mostra o aviso de "já garantiu hoje" e soma +1 na altura visual da raiz; envolto num `View` com `ref`,
   ver "Tour de funcionalidades" abaixo)
3. Headline "Tarefas de hoje"
4. `TaskList` (lista de `TaskItem`) + botão discreto "Estou travado" (abre `TravadoFlowScreen`,
   spec `09-ponte-fuga-tarefa`) + `AddTaskForm` (`forwardRef` — o `ref` aponta só pro
   botão "Adicionar tarefa", não pro formulário inteiro)
5. Overlays condicionais por cima de tudo, nesta ordem: `TaskCompletedOverlay`,
   `RootWateringOverlay` (animação da raiz ao concluir a essencial: ponto Cobre desce
   pelo caule, barra até o próximo marco, ~3s ou toque fecha),
   `StreakMilestoneModal` (só aparece quando os dois overlays anteriores já saíram),
   `FeatureTourOverlay` (por último — fica por cima dos outros se coincidirem), e `TravadoFlowScreen` quando aberto (botão da Home ou toque
   longo numa tarefa — remonta com uma `key` nova a cada abertura, sempre começa do
   passo "escolha")

Não existe mais nenhum banner/status card de bloqueio de apps na Home — a visibilidade
do bloqueio hoje vive só em Perfil → "Configurar bloqueio de apps" (`BloqueioAppsScreen`).
Montada também na Home: `useSincronizarRegrasBloqueio(uid)`, sem UI própria — roda a
cada abertura do app pra promover uma `regrasBloqueioPendentes` já vencida de volta
pro Firestore, caso o lado nativo já tenha promovido localmente enquanto o app estava
fechado (ver `regras-de-negocio.md` seção 4/5).

### `TaskItem`
| Prop | Tipo | Descrição |
|---|---|---|
| `tarefa` | `Tarefa` | Objeto inteiro (`domain/types.ts`): `essencial` exibe selo de estrela; `tipo === 'exercicio'` exibe ícone e `duracaoMinutos`; `origemRecorrenteId` exibe ícone ↻ e habilita `RecurringTaskActionSheet` |
| `onAlternar` | `(id) => void` | Marca/desmarca. A escrita otimista + rollback silencioso em falha vive em `useDailyTasks`, não no componente |
| `onEstouTravado` | `(id) => void` opcional | Abre o TravadoFlow; a linha não aparece pra tarefa já concluída |
| `onEditar` | `(id, titulo) => void` opcional | Edição de título |
| `onRemover` | `(id) => void` opcional | Remoção da tarefa avulsa |
| `onRemoverHoje` / `onPararDeRepetir` | function opcionais | Só pra tarefas recorrentes (`RecurringTaskActionSheet`) |

Toque longo abre `TaskActionsSheet` (avulsa) ou `RecurringTaskActionSheet` (recorrente)
— as duas ganharam a linha **"Estou travado"** (spec `09-ponte-fuga-tarefa`, primeira
opção do menu), que não aparece pra tarefa já concluída.

### `AddTaskForm`
Campo de título + toggle essencial + `TaskTypeToggle` (exercício/duração) + toggle
"Repetir todos os dias". Ao confirmar com recorrência ativada, cria `essentialTasks` +
a tarefa de hoje na mesma operação (nessa ordem — não cria tarefa órfã se a recorrente
falhar).

### `RecurringTaskActionSheet`
3 opções ao toque longo numa tarefa recorrente: "Remover só hoje" / "Parar de repetir" /
"Cancelar". Mesmo padrão visual do `ConfirmDeleteAccountModal`, arquivo próprio (não
importa o componente).

### `StreakMilestoneModal`
| Prop | Tipo |
|---|---|
| `marco` | number (3, 7, 14, 30, 60, 90) |
| `corpo` | string (de `systemMessages/marco_N`) |
| `onDismiss` | function |

### `RecoveryStateCard`
| Prop | Tipo |
|---|---|
| `tipo` | `'escudo'` \| `'reduzido'` |
| `corpo` | string (de `systemMessages`) |

### `ReturnAfterPauseCard`
| Prop | Tipo |
|---|---|
| `porqueTexto` | string |
| `corpoComTexto` | string (systemMessages com `{{porqueTexto}}` já substituído) |
| `onSubmitTarefa` | function |

### RotinaConfirmacaoScreen
Confirmação única da rotina estimada (HU-10, RN04/RN05; spec
`09-ponte-fuga-tarefa-e-estou-travado.md` seção 5). `LuaDecorativa` + eyebrow
"PADRÃO IDENTIFICADO" + título "Parece que você costuma dormir por volta das
{dormir}." + horário estimado de dormir em destaque + linha "Entre {início da
janela} e {acordar}, abrir as redes vai pedir uma pausa um pouco maior."
(`domain/rotina.ts` `horarioPausaMaior`). "Ajustar horário" (`SecondaryButton`) troca
o eyebrow para "AJUSTAR HORÁRIO", o título para "Quando você costuma dormir e
acordar?" e revela as linhas "Dormir"/"Acordar", cada uma com "Alterar"
(`DateTimePicker`) — a linha da janela recalcula ao vivo. "Usar o horário estimado"
volta aos valores calculados e ao modo leitura. Horários iguais (RN08) desabilitam
"Confirmar" e mostram "Os horários de dormir e acordar precisam ser diferentes.". O
voltar físico (`useVoltarFisico`) chama `onAdiar`, não `onConfirmar` (RN09) — sai sem
gravar nada, a tela só volta a aparecer no dia seguinte. Tom de padrão identificado,
nunca de regra imposta.

| Prop | Tipo |
|---|---|
| `dormirEstimado` / `acordarEstimado` | string (HH:mm) — de `useRotina.estimativa` |
| `onConfirmar` | `(horarios?) => void` — `useRotina.confirmar`: grava `rotina.dormirEstimado`, `rotina.acordarEstimado`, `rotina.confirmadoEm` (data local AAAA-MM-DD) e `rotina.modoManual` (RN06/RN07 — `true` só quando veio de um ajuste). Sem argumento = estimativa como veio; com argumento = horários ajustados. Ao gravar, liga `perguntarAlternativa` |
| `onAdiar` | `() => void` — `useRotina.adiar`: grava a data de amanhã em `rotina_confirmacao_adiada` (AsyncStorage, RN09) e esconde a confirmação até lá |

### AlternativaNoturnaScreen
Pergunta única e opcional "O que você gostaria de fazer à noite?" (HU-10, RN11),
mostrada logo depois da confirmação da rotina. Ícone `BookOpen` + `TextField`
"Alternativa noturna (opcional)" (`maxLength={40}`) + 4 chips de sugestão ("Ler um
pouco", "Preparar o dia de amanhã", "Alongar", "Escrever 3 linhas") que só preenchem
o campo + "Salvar" (`PrimaryButton`, **desabilitado** com o campo vazio ou só espaço)
+ "Agora não" (`SecondaryButton`). Editável depois em `RotinaPerfilScreen`.

| Prop | Tipo |
|---|---|
| `onSalvar` | `(texto: string) => void` — `useRotina.salvarAlternativa`: grava `rotina.alternativaNoturna` (texto já sem espaços nas pontas) |
| `onAgoraNao` | function — `useRotina.dispensarAlternativa`: não grava nada, só desliga `perguntarAlternativa` (a pergunta não volta) |

### ProgressoScreen
1. 2 `statbox` (streakAtual, diasTotaisAtivos)
2. Faixa de 7 `DayStatusPill` — toque abre `DayDetailSheet` (exceto status
   `sem_registro`, que não faz nada ao toque)
3. `ChallengeCard` semanal + `ChallengeCard` mensal

### `DayDetailSheet`
| Prop | Tipo |
|---|---|
| `visible` | boolean |
| `label` | string ("Quarta-feira" — o status vem em prop separada) |
| `status` | `StatusHistoricoDia` |
| `tarefas` | `Tarefa[]` — renderização somente-leitura, sem toggle funcional |
| `onClose` | function |

### PerfilScreen
Seções, em ordem (HU-09, RN13): "Seu porquê" → grupo de navegação (Bloqueio de apps,
Rotina noturna, Lembrete diário) → grupo "Sobre" → "Sair" → "Excluir conta" → link de
debug (condicional).

"Seu porquê" (RN14): com texto cadastrado, mostra uma citação (Zilla itálico, barra
Musgo à esquerda) + link "Editar", que revela o `TextField` + botão "Salvar" (como
antes). Sem porquê cadastrado, o campo aparece direto, sem citação.

Grupo de navegação, cada linha com ícone + título + estado atual numa linha (dá pra
saber se o bloqueio está ativo sem entrar na tela):
- "Bloqueio de apps" (ícone `Lock`): `Ativo · {resumoCurtoBloqueio(regrasVigentes)}` /
  "Desativado" (serviço desligado, com regra salva) / "Não configurado" (sem
  `regrasBloqueio`). Lê `useAccessibilityPermission` + `useRegrasBloqueio(uid)`. Toque
  abre `BloqueioAppsScreen`.
- "Rotina noturna" (ícone `Moon`): forma curta de `resumoRotina` (`domain/rotina.ts`),
  ex. "23:30 – 07:00". Só aparece quando `aoAbrirRotina` é passado; toque abre
  `RotinaPerfilScreen`.
- "Lembrete diário" (ícone `Bell`): título + horário como subtítulo (só com
  notificações ativas) + `Switch` à destra. Tocar no título/subtítulo abre o
  `DateTimePicker` (só se já ativo); o toggle liga/desliga, como antes.

"Sobre": "Ver tutorial novamente" (reinicia o tour de funcionalidades — ver seção
própria abaixo) + links legais (Política de Privacidade / Termos de Uso).

"Sair" (RN18): `SecondaryButton`, não mais `PrimaryButton`. "Excluir conta" (RN18):
link de texto centralizado (Terra Suave, sublinhado), não mais um botão com borda —
mesma ação de sempre (abre `ConfirmDeleteAccountModal`). Nenhum dos dois usa vermelho
nem Cobre. Debug: link "Testar Crashlytics" (só em dev ou com
`MOSTRAR_TESTAR_CRASHLYTICS`).

### BloqueioAppsScreen
`BackButton` no topo (`onVoltar` → `navigation.goBack()`). Voltar — pelo botão ou pelo
voltar físico (`useVoltarFisico`) — nunca pede confirmação: se a edição difere do que
está salvo (`mesmasRegrasBloqueio`, `domain/appBlock.ts`; a pré-marcação da primeira
configuração não conta), sai e mostra o toast "Suas alterações não foram salvas.".
Com `AvisoAlteracaoPendenteScreen` aberto, o voltar físico equivale a "Voltar e
revisar".

Status do `isAccessibilityServiceEnabled()` (via `useAccessibilityPermission`) +
**duas entradas pra `DivulgacaoAcessibilidadeScreen`**, sempre a mesma rota (quem
decide o layout é o status real do serviço, não qual das duas foi tocada):
- Link "Saiba o que é" (ícone `Info` da lucide + texto sublinhado terraSuave,
  nunca Cobre) — **visível sempre**, ativo ou desativado, pra quem já ativou
  conseguir reler o que o serviço faz.
- Botão "Ativar" (`SecondaryButton`, não `PrimaryButton` — o único Cobre da tela é
  o "Salvar" do rodapé) — só quando desativado. Acima dele, linha terraSuave "Sem
  ele, o Rootora não consegue interceptar os apps abaixo."

Nenhum dos dois abre as configurações do Android direto — isso só acontece de
dentro da divulgação.

A partir da HU-09 (RN01), a tela é organizada em seções com eyebrow em Space Mono
(`SecaoConfig`, `src/components/bloqueio/SecaoConfig.tsx`), nesta ordem: Status do
serviço → QUANDO → APPS → SESSÕES → ROTINA NOTURNA → "Medir tempo nas redes" (condicional)
→ resumo em texto + "Salvar".

- QUANDO/APPS: `SeletorDiasSemana` (Terra Escura quando selecionado, borda Terra
  Suave quando não — antes Cobre) e lista de `AppListItem` (checkbox customizado,
  caixa marcada em Musgo — antes Cobre; não Switch nativo, quebra em testes Jest no
  mesmo arquivo de um `LoadingIndicator`), restrita à lista curada de redes sociais
  instalada (HU-01 — nunca todo app do aparelho), com busca por nome, e os dois
  seletores de horário início/fim (`DateTimePicker`).
- SESSÕES (só leitura, sem tela de edição): 3 números lidos de `regrasBloqueio`
  vigente com os padrões de `domain/saldoBloqueio.ts` (`duracaoBlocoMin`: 15 min,
  `cooldownMin`: 45 min) e `ACESSOS_RAPIDOS_DIARIOS` (`domain/acessoRapido.ts`: 3x).
  Link "Como funciona" abre `SessoesInfoSheet`
  (`src/components/bloqueio/SessoesInfoSheet.tsx`). Com `blocosDiarios` numérico,
  linha extra "Até {n} sessões por dia.".
- ROTINA NOTURNA: resumo de `resumoRotina` (`domain/rotina.ts`, forma "longa") +
  link "Editar", que abre `RotinaPerfilScreen` (prop `aoAbrirRotina`). Com rotina
  confirmada, linha extra "Pausa maior entre {horarioPausaMaior(dormirEstimado)} e
  {acordarEstimado}". A tela não edita a rotina — isso só acontece na
  `RotinaPerfilScreen`, aberta pela linha "Rotina noturna" de `PerfilScreen` ou por
  este link.
- "Medir tempo nas redes" (abre `DivulgacaoAcessoUsoScreen`), visível enquanto o
  acesso de uso estiver desligado.
- Resumo em texto (`resumoRegrasBloqueio`, `domain/appBlock.ts`) + "Salvar" — único
  Cobre da tela.

Edita a partir da regra PENDENTE quando existe uma (o que vai valer amanhã), senão
da vigente. Com uma pendência, banner no topo da tela (só borda Terra Suave, sem
fundo — pra não competir com o status): eyebrow "VALE A PARTIR DE AMANHÃ" +
`resumoCurtoBloqueio(regrasPendentes)` (`domain/appBlock.ts`, RN10 — "{n} apps ·
{dias} · {início}–{fim}") + "Cancelar alteração".

Tocar "Salvar" quando `regrasVigentes` já existe (qualquer alteração depois da
primeira configuração) não grava nada na hora — renderiza
`AvisoAlteracaoPendenteScreen` no lugar da lista primeiro (estado local
`mostrarAvisoPendente`, não é uma rota nova). Só na primeira configuração
(`regrasVigentes` ainda ausente) o "Salvar" grava direto, sem passar por esse aviso.

### `AvisoAlteracaoPendenteScreen`
Componente burro renderizado por `BloqueioAppsScreen` (não uma tela do
`PerfilStack` — evita duplicar o carregamento de `appsInstalados`/`regrasVigentes`
numa rota separada). Mostrada sempre que "Salvar" resultaria numa alteração
pendente — nunca na primeira configuração. Título "Antes de salvar" (HU-09 — antes
"A mudança vale a partir de amanhã"). Reconhece o momento sem culpa (frase sobre a
vontade de soltar o bloqueio "ser só o momento falando"), explica o mecanismo e
mostra `resumoCurtoBloqueio` (`domain/appBlock.ts`, RN10 — antes
`resumoRegrasBloqueio`) de antes ("HOJE CONTINUA") e depois ("A PARTIR DE AMANHÃ").
Acima dos botões, linha com ícone `Info`: "Precisa parar agora? Dá para desligar o
serviço nas configurações de acessibilidade do Android, a qualquer momento." — só
texto, sem link nem botão (RN12).

| Prop | Tipo |
|---|---|
| `resumoVigente` / `resumoNovo` | string — `resumoCurtoBloqueio` de quem chama |
| `onConfirmar` | function — grava de fato (chama `useRegrasBloqueio.salvar`) |
| `onRevisar` | function — só volta pra edição, nada é gravado |

### `AppListItem`
| Prop | Tipo |
|---|---|
| `app` | `{ packageName, nome, iconeBase64 }` — vem de `listarAppsInstalados()`, restrito à lista curada de redes sociais (HU-01), resolvido via `<queries>` (pacotes explícitos), nunca `QUERY_ALL_PACKAGES` |
| `selecionado` | boolean |
| `onToggle` | function |

### `SeletorDiasSemana`
| Prop | Tipo |
|---|---|
| `diasSelecionados` | `number[]` (0 = domingo) |
| `onToggleDia` | function |

### DivulgacaoAcessibilidadeScreen
Divulgação em destaque exigida pela Play Store, aberta a partir de `BloqueioAppsScreen`
(botão "Ativar" OU link "Saiba o que é" — mesma rota, sem parâmetro). O layout é
decidido pelo status REAL do serviço (`useAccessibilityPermission`, reavaliado via
`AppState 'active'` — não um parâmetro de rota, então o layout troca sozinho se o
usuário desativar o serviço pelas Configurações do Android enquanto essa tela está
aberta em background). Conteúdo comum aos dois estados — título + parágrafo de
abertura + card (fundo `surface`) com 3 blocos separados por divisória 1px
`terraSuave` a 25% de opacidade, eyebrow Space Mono: "O QUE ELE VÊ" / "O QUE ELE NÃO
VÊ" / "O QUE FICA REGISTRADO". Texto exato em `regras-de-negocio.md` seção 4.

- **Desativado:** `PrimaryButton` "Concordo e quero ativar" (grava
  `consentimentoAcessibilidade` via `useConsentimentoAcessibilidade` e só depois abre
  as configurações de acessibilidade do Android) + `SecondaryButton` "Agora não" (só
  volta, sem gravar nada).
- **Ativo:** selo "ATIVO" (ponto `musgo` + texto Space Mono, fundo `surface`, radius
  full) acima do título + parágrafo extra explicando que dá pra desativar quando
  quiser + `PrimaryButton` "Entendi" (`onVoltar`) + link de texto "Abrir
  configurações do Android" (mesmo estilo do "Saiba o que é" — chama
  `openAccessibilitySettings()` direto, nativo). **Nunca** grava nem sobrescreve
  `consentimentoAcessibilidade` neste estado — só a primeira vez que o usuário
  concorda é que isso é gravado.

### DivulgacaoAcessoUsoScreen
Mesmo padrão da `DivulgacaoAcessibilidadeScreen`, pro acesso de uso
(`UsageStatsManager`) em vez do Accessibility Service — aberta a partir da entrada
"Medir tempo nas redes" de `BloqueioAppsScreen`, visível enquanto esse acesso estiver
desligado. Texto exato em `regras-de-negocio.md` seção 4. `PrimaryButton` "Permitir
acesso de uso" (grava `consentimentoAcessoUso` e abre as configurações de acesso de
uso do Android) + `SecondaryButton` "Agora não". Ao voltar das configurações sem
conceder, mostra "Acesso de uso desligado. O bloqueio continua funcionando, só sem
medir o tempo."

### RotinaPerfilScreen
Rotina noturna no Perfil (HU-10, RN13/RN14/RN15; spec
`09-ponte-fuga-tarefa-e-estou-travado.md` seção 5), rota `RotinaPerfil` do
`PerfilStack`. Usa `useRotina(uid)` e `useAcessoUso()` direto. `BackButton` + título
"Rotina noturna" + selo "AUTOMÁTICO" (`modoManual` falso) ou "AJUSTADO À MÃO"
(verdadeiro) — selo só aparece com `rotina.confirmadoEm` preenchido.

Horário e alternativa ficam em **rascunho local** até um único "Salvar"
(`PrimaryButton`): linhas "Dormir: HH:mm"/"Acordar: HH:mm" com "Alterar"
(`DateTimePicker`, só atualiza o rascunho) e `TextField` "No lugar da tela, à noite"
(`maxLength={40}`). Com `rotina.confirmadoEm`: linha "Pausa maior entre {início da
janela} e {acordar}, todos os dias." (recalculada ao vivo pelo rascunho); "Salvar"
só chama `editarHorarioManual` se o horário mudou e só `salvarAlternativa` se o texto
mudou — mudar só a alternativa não liga `modoManual` (RN13). Com `modoManual`: link
"Recalcular automaticamente". Sem `rotina.confirmadoEm` ainda (RN14): mostra
`resumoRotina` ("Precisa medir o tempo nas redes" + link "Medir tempo nas redes" que
abre `DivulgacaoAcessoUsoScreen`, ou "Aprendendo seu horário · {n} de 5 dias"), sem
selo, sem o campo de alternativa; os horários partem de 23:00/07:00 editáveis e
"Salvar" chama `useRotina.confirmar(horarios)` (grava `confirmadoEm` e
`modoManual: true` pela primeira vez).

| Prop | Tipo |
|---|---|
| `uid` | string |
| `onVoltar` | function — `navigation.goBack()` |
| `aoAbrirMedirTempo` | function — `navigation.navigate('DivulgacaoAcessoUso')` |

Ações (via `useRotina`, não props):

| Ação | Grava |
|---|---|
| "Salvar" sem `rotina.confirmadoEm` | `useRotina.confirmar(horarios)` → `rotina.dormirEstimado`/`acordarEstimado`/`confirmadoEm`/`modoManual = true` |
| "Salvar" com horário alterado | `useRotina.editarHorarioManual` → `rotina.dormirEstimado` e/ou `rotina.acordarEstimado` + `rotina.modoManual = true` (com `modoManual`, `estimarRotina` devolve null) |
| "Salvar" com alternativa alterada | `useRotina.salvarAlternativa` → `rotina.alternativaNoturna` |
| "Recalcular automaticamente" | `useRotina.recalcularAutomaticamente` → `rotina.modoManual = false` + toast + marca `rotina_recalculo_pendente` (AsyncStorage, RN15) — não regrava `dormirEstimado`/`acordarEstimado` na hora |

### TravadoFlowScreen (spec `09-ponte-fuga-tarefa-e-estou-travado.md`)
Componente único, reutilizado sem diferença nas 2 entradas (botão da Home e toque longo
em `TaskItem` — o antigo terceiro caminho, pelo "Estou travado" da `InterceptScreen`,
não existe mais desde a HU-04). Máquina de passos interna — mesmo espírito do
`OnboardingScreen` — não uma sequência de rotas:

| Prop | Tipo | Descrição |
|---|---|---|
| `tarefaContexto` | `Tarefa \| null` | A tarefa que estava travando — `null` quando não há essencial pendente hoje |
| `tarefas` | `Tarefa[]` | Lista do dia, pra checar se já foi concluída por outro caminho enquanto o fluxo estava aberto |
| `origem` | `OrigemSessaoFoco` | `'travado'` nas 2 entradas do TravadoFlow (Home, toque longo) — `'interceptacao'` é usado só pelo atalho neutro de 5 min sem tarefa do cooldown/saldo zerado, que não passa por este componente |
| `criarSubtarefa` / `editarTarefa` / `moverTarefaParaAmanha` / `alternarTarefa` | function | Vêm de `useDailyTasks` — o componente nunca fala com Firestore direto |
| `onFechar` | function | Volta pra Home |

Passos: `escolha` (4 chips) → `resposta` (texto + ação por estado) → `sessao`
(`SessaoFocoScreen`) ou `concluido` (energia → versão menor/amanhã, sem timer).

### SessaoFocoScreen
Timer + FimSessao, usada pelo `TravadoFlowScreen` (origem `'travado'`/`'home'`) e
também, direto, pela `EsperaBloqueioScreen` do root `Intercept` (origem
`'interceptacao'`, atalho neutro de 5 min sem tarefa, oferecido em COOLDOWN/
SALDO_ZERADO). Nenhuma sessão libera app bloqueado algum ao terminar — o botão
"Seguir para o [app]"/"Liberar o [App] por 15 minutos" que existia antes da HU-04 foi
removido junto dos estados A/C: quem quiser acesso ao app passa pela pausa de
intenção ou pelas válvulas de escape (seção "Root separado — `Intercept`" acima),
nunca pelo fim de uma sessão de foco.

### InterceptScreen (root `Intercept`, spec `09-ponte-fuga-tarefa-e-estou-travado.md`)
Ver "Root separado — `Intercept`" na seção 1 acima pra árvore completa. A fase vem do
nativo (`useBloqueioSaldo`; `estadoBloqueioJson` relido ao montar e a cada segundo em
COOLDOWN/SALDO_ZERADO) — não decide mais nenhum estado a partir de tarefas essenciais
(os antigos estados A/C e o snapshot de tarefas que eles exigiam não existem mais).
`rotinaJson` (prop opcional, espelho de `users/{uid}.rotina`) diz se a janela noturna
está ativa agora, pra dobrar a pausa de intenção e trocar o texto padrão pela mensagem
do banco `noturno` (seção 5 da spec 09).

### Telas de permissão
`DivulgacaoAcessibilidadeScreen`, `DivulgacaoAcessoUsoScreen` (ambas no Perfil, antes
de abrir as respectivas configurações do Android) e `NotificationPrimingScreen` (antes
do primeiro pedido de permissão de notificação, pós-onboarding) — conteúdo fixo de
explicação, sem lógica de negócio própria além de gravar o consentimento/decisão do
usuário.

### Tour de funcionalidades (pós-onboarding)
Diferente do Tutorial Inicial (conceitual, pré-login, carrossel de 4 slides) — este
aponta pra elementos REAIS da UI já logada, na primeira vez que a `HomeScreen` renderiza
depois do onboarding. Controlado por `useFeatureTour` (AsyncStorage
`tour_funcionalidades_visto`, mesmo padrão de `tutorial_visto`); conteúdo dos 4 passos
em `src/components/tour/tourSteps.ts`; renderização em `FeatureTourOverlay.tsx`
(componente burro — recebe posição e texto já resolvidos, não decide nenhum dos dois).

4 alvos, nesta ordem: `StreakCard` → botão "Adicionar tarefa" (os 2 dentro da
`HomeScreen`) → aba Progresso → aba Perfil (os 2 últimos na tab bar do
`MainTabNavigator`, sem navegar de verdade — só recorte visual). O alvo de bloqueio de
apps foi removido do tour junto da remoção do banner/status card da Home (seção
"HomeScreen" acima).

Posição vem de `measureInWindow` nos refs reais dos 4 elementos, nunca coordenada fixa.
Os refs das abas Progresso/Perfil só podem ser criados no `MainTabNavigator` (onde os
nós nativos existem — via `tabBarButton` customizado nessas 2 abas, preservando o toque
normal) e são repassados como prop simples até a `HomeScreen`, atravessando o
`HojeStack` sem lógica no meio (mesmo padrão de repasse já usado por
`avaliarAlertaRisco`). O overlay bloqueia toque em qualquer coisa por baixo enquanto
ativo — por isso não existe scroll "ao vivo" a acompanhar: ao entrar num passo cujo
alvo está fora da faixa visível, a `HomeScreen` rola até uma posição previsível antes de
remedir.

Link "Ver tutorial novamente" na `PerfilScreen` (seção "Sobre", junto dos links legais)
chama `useFeatureTour().reiniciar()` — reseta a flag e navega de volta pra aba Hoje, que
é onde o tour de fato aparece.

---

## 3. Bibliotecas em uso (atualizado)

| Necessidade | Biblioteca |
|---|---|
| Navegação | `@react-navigation/native` + `/native-stack` + `/bottom-tabs` |
| Firebase | `@react-native-firebase/app`, `/auth`, `/firestore`, `/messaging` (nativo, não SDK web) |
| Login Google | `@react-native-google-signin/google-signin` |
| Armazenamento local leve | `@react-native-async-storage/async-storage` |
| Animações | `Animated` do core (Splash, Tutorial, `LoadingIndicator`) — `react-native-reanimated` não está instalado |
| Notificações locais | `@notifee/react-native` (o app usa notificação local, não FCM — ver `CLAUDE.md`) |
| Seletor de horário | `@react-native-community/datetimepicker` |
| Ícones | `lucide-react-native` |
| Testes | Jest + `@testing-library/react-native` |

---

## 4. Próximo passo sugerido

Este documento e o `schema-firebase.md` agora refletem o motor de sessões/válvulas de
escape/rotina noturna e a lista curada de redes sociais (HU-01 a HU-06). Ver
`stack-tecnico.md` pra dívida técnica e libs.
