# Regras de Negócio — Rootora

> Documento vivo. Consolida `regras-streak-e-textos-mvp.md` + a parte de mecânica de
> `05-fase3.md` — as duas fontes de regra de negócio que antes viviam separadas por
> fase. Terminologia: **"proteção"** é o nome voltado ao usuário do mecanismo antes
> chamado de "escudo" — o nome interno (`escudosDisponiveis`, `variant: 'escudo'`,
> `protegido_escudo`) continua existindo no código e não precisa mudar.

---

## 1. Streak e Proteção

### O que conta como "dia cumprido"
Pelo menos 1 tarefa marcada como essencial concluída no dia.

### Sistema de Proteção
| Regra | Valor |
|---|---|
| Proteções disponíveis por semana | 1 |
| Renovação | Toda segunda-feira, automático |
| Acúmulo | Não acumula — expira se não usado |
| Ativação | Automática, sem ação do usuário |
| Efeito | Streak numérico não é zerado; dia perdido fica marcado no histórico de forma neutra |

### Sem proteção disponível
- **1 dia perdido:** streak cai para 50% do valor anterior (arredondado pra baixo), nunca pra 0
- **2+ dias seguidos perdidos:** streak reinicia em 1 no próximo dia cumprido;
  `diasTotaisAtivos` nunca reseta

### Marcos de celebração
3 · 7 · 14 · 30 · 60 · 90 dias

### Lógica diária (executada ao abrir o app, comparando `ultimoDiaAtivo` com a data atual)
1. Dia cumprido → `streakAtual += 1`, `diasTotaisAtivos += 1`
2. Dia não cumprido e proteção disponível → consome a proteção, streak mantido,
   `statusDia = 'protegido_escudo'`
3. Dia não cumprido e sem proteção → `streakAtual = floor(streakAtual * 0.5)`,
   `statusDia = 'perdido'`
4. 2+ dias seguidos não cumpridos → `streakAtual = 0`, `statusStreak = 'pausado'`
   (dispara `ReturnAfterPauseScreen` no próximo acesso)

### Textos do produto — streak/proteção

**Escudo/proteção ativado (dia perdido, protegido):**
> "Ontem não saiu como planejado — e tudo bem. Seu progresso continua de pé. Hoje é um novo dia para agir."

**Streak reduzido (sem proteção):**
> "Você perdeu um dia e isso teve um custo — sua sequência caiu para {{streak}}. Mas {{diasTotais}} dias reais continuam contando. Vamos seguir a partir daqui, não do zero."
> (`{{streak}}` e `{{diasTotais}}` são valores DIFERENTES — sequência pós-queda e total de dias ativos, não o mesmo número repetido)

**Retorno após pausa longa (2+ dias):**
> "Você esteve fora por alguns dias. Isso acontece — não precisa explicar, só decidir o próximo passo. Lembra por que você começou? *[reexibe o "porquê" do onboarding]* Vamos escolher 1 coisa pequena para hoje."

**Dia zerado (nenhuma tarefa feita, sem proteção):**
> "Hoje não rolou, e tudo bem — um dia não define o processo. Amanhã é uma página nova, não uma dívida a pagar."

**Marcos** — ver `banco-de-frases.md` para o texto exato de cada marco (3/7/14/30/60/90).

---

## 2. Tarefas recorrentes

- Qualquer tarefa pode ser marcada "Repetir todos os dias" ao ser criada — gera um
  documento em `essentialTasks` além da tarefa do dia.
- Todo `dailyLog` novo nasce pré-populado com as `essentialTasks` ativas.
- "Remover só hoje" tira só do dia atual, sem afetar a recorrência futura.
- "Parar de repetir" desativa a recorrência (`ativa: false`), sem apagar o histórico já
  gerado em dias anteriores.

---

## 3. Desafios semanais e mensais

Catálogo fixo — usuário não cria nem escolhe, um semanal + um mensal ativos por vez,
gerados automaticamente no início de cada período (segunda-feira / dia 1).

| Desafio | Período | Meta |
|---|---|---|
| "Exercite-se 3x essa semana" | Semanal | 3 tarefas `tipo: 'exercicio'` concluídas na semana |
| "Cumpra sua essencial todo dia" | Semanal | 7 dias com `statusDia` `cumprido` ou `protegido_escudo` |
| "20 dias ativos esse mês" | Mensal | 20 dias com `statusDia` diferente de `sem_registro` e `perdido` |

Progresso é sempre recalculado a partir dos `dailyLogs` reais do período (nunca
incrementado manualmente). Se a meta não for atingida no fim do período, o desafio
expira (`status: 'expirado'`) sem afetar streak ou qualquer outra métrica.

---

## 4. Bloqueio de apps

Sistema antigo (custo crescente por nível, campo `bloqueioApps`, `AppBlockedScreen`)
foi **removido por completo** — nenhuma migração de dado (não havia usuário real).
Hoje existe um único caminho, descrito aqui (configuração) e na seção 5 (interceptação
e ponte fuga→tarefa).

### Detecção
**Accessibility Service** (não `UsageStatsManager`+overlay — decisão tomada
priorizando precisão sobre menor escrutínio de loja). Lê só o nome do pacote do app em
primeiro plano (`typeWindowStateChanged`); `canRetrieveWindowContent="false"` — nunca
lê conteúdo de tela.

### Configuração (Perfil → "Bloqueio de apps")
- **Status do serviço** — "Ativo"/"Desativado" + botão "Ativar" quando desativado,
  que leva à divulgação em destaque (ver abaixo) antes de abrir as configurações do
  Android.
- **Lista de apps** — ícone + nome + busca + seleção múltipla. Resolvida via
  `<queries>` no manifest (MAIN/LAUNCHER) — **nunca `QUERY_ALL_PACKAGES`**, que exigiria
  justificativa extra de revisão manual na Play Store para este caso de uso.
- **Uma única janela de horário** aplicada a todos os apps selecionados (não por app
  individual): início, fim (precisa ser depois do início — esta versão não cobre
  janela que atravessa a meia-noite) e dias da semana.
- **Resumo em texto** + botão "Salvar" — ver seção 5 pra regra de quando a mudança
  vale imediatamente vs. no dia seguinte.

### Divulgação em destaque do Accessibility Service
Exigência de política da Play Store: tela própria, fora de qualquer menu, mostrada
antes de abrir as configurações de acessibilidade do Android (nunca depois).

> **Como o bloqueio funciona**
> Para interceptar um app, o Rootora usa o serviço de acessibilidade do Android.
> Ele identifica apenas qual app foi aberto, para mostrar sua tarefa do dia no lugar dele.
> Não lê o que você digita e não vê o conteúdo das telas.
> O Rootora registra quais apps foram interceptados e quando.
>
> Botões: "Concordo e quero ativar" (abre as configurações) · "Agora não"

Consentimento gravado em `users/{uid}.consentimentoAcessibilidade` (data), só ao
tocar "Concordo e quero ativar" — nunca antes.

### Modo informativo (serviço já ativo)
A mesma tela de divulgação é reaproveitada como explicação pra quem já ativou o
serviço — acessível pelo link "Saiba o que é", sempre visível no card de status em
`BloqueioAppsScreen` (ativo ou desativado), não só pelo botão "Ativar". O conteúdo
comum (os 3 blocos "o que vê" / "o que não vê" / "o que fica registrado") é sempre
o mesmo; o que muda é a ação ao final:

- Com o serviço **desativado**: os dois botões originais (acima).
- Com o serviço **ativo**: um selo "ATIVO" acima do título, um parágrafo dizendo
  que dá pra desativar quando quiser nas configurações do Android, um botão
  "Entendi" (só fecha a tela) e um link "Abrir configurações do Android" (atalho
  direto, sem passar pela divulgação de novo). **Neste modo a tela nunca grava
  nem sobrescreve `consentimentoAcessibilidade`** — esse campo registra só a
  primeira vez que o usuário concordou, não toda visita à tela.

O layout é decidido pelo status real do serviço no momento (reavaliado ao app
voltar pro primeiro plano), não por qual caminho levou até a tela — importante
porque o usuário pode desativar o serviço nas configurações do Android enquanto
a divulgação está aberta e voltar: a tela precisa refletir isso sozinha.

Nenhum desbloqueio envolve Health Connect/calorias ainda (📋 planejado, ver
`roadmap-e-status.md`).

---

## 5. Ponte fuga→tarefa e TravadoFlow

Extensão do bloqueio de apps (spec `09-ponte-fuga-tarefa-e-estou-travado.md`): o app de
fuga passa a levar de volta à tarefa evitada, reduzida a um passo mínimo, em vez de só
bloquear. **Único caminho de interceptação** — `regrasBloqueio` → `InterceptActivity`
(schema e tela de configuração da seção 4). Liberar o app acontece por um de dois
jeitos, nunca por desafio nem por respiração cronometrada:

### InterceptScreen — 3 estados
| Estado | Condição | Ação primária |
|---|---|---|
| A | Existe essencial pendente | "Fazer 2 minutos" (sessão de foco de 2 min na tarefa) |
| B | Essenciais do dia já cumpridas | "Liberar" o app por 15 minutos |
| C | Nenhuma essencial cadastrada hoje | Campo de texto → cria a essencial → vira estado A |

Seleção da tarefa no estado A: a primeira essencial pendente, ou — se alguma tiver o
campo `quando` (HH:mm) preenchido — a de horário mais próximo do momento atual.

### TravadoFlow — "O que está pegando agora?"
Acessível pelas 3 entradas com o **mesmo componente**: botão discreto abaixo da lista na
Home, toque longo numa tarefa (`TaskCard`/`TaskItem`), e a partir do estado A da
InterceptScreen ("Estou travado"). 4 chips de toque único:

| Chip | Resposta | Ação |
|---|---|---|
| Não sei por onde começar | Escreve o primeiro passo físico | Cria subtarefa (`tarefaPaiId`) → sessão de 2 min |
| Tenho medo de ficar ruim | "Faça a versão feia primeiro" | Sessão de 5 min direto, sem subtarefa |
| Está chato demais | "Não precisa gostar" | Sessão de 5 min direto |
| Estou sem energia | 3 opções | Versão menor da tarefa · Descansar 10 min · Passar pra amanhã |

"Passar para amanhã" nunca mostra texto de culpa; se era a única essencial do dia, segue
a regra normal de proteção/queda parcial (seção 1).

### Regra do streak
Sessões de foco (2/5/10 minutos, qualquer origem) **nunca alteram `streakAtual`** — só a
conclusão da tarefa essencial em si conta (regra "dia cumprido" da seção 1, inalterada).
Evita que o timer vire atalho e esvazie o significado do streak.

### Regra de pré-compromisso (regra única — ver spec 09, seção 6)
A primeira configuração de `regrasBloqueio` vale na hora. **Qualquer alteração depois
disso** — inclusive desativar o bloqueio — só vale a partir do dia seguinte
(`regrasBloqueioPendentes.efetivaEm`), sem distinguir se a mudança afrouxa ou endurece.
Uma nova alteração enquanto já existe uma pendente substitui a pendente. A promoção
pendente→vigente acontece no lado nativo (Kotlin, `BloqueioPrefs`), não no JS — roda
mesmo com o app fechado; na próxima abertura, o RN sincroniza o resultado de volta no
Firestore (`useSincronizarRegrasBloqueio`). Lógica pura testada em
`aplicarRegrasBloqueioPendentesSeVencidas`/`decidirGravacaoRegrasBloqueio`
(`domain/appBlock.ts`).

---

## 6. Princípios que regem qualquer regra nova

Antes de adicionar ou ajustar qualquer mecânica (streak, desafio, bloqueio ou o que vier
depois), checar contra os 5 princípios do produto (`CLAUDE.md`):
1. Reduzir a ameaça percebida da tarefa, nunca aumentar cobrança
2. Comunicação honesta — nunca prometer efeito neurológico que não existe
3. Recaída sem vergonha — fricção crescente é aceitável, punição não
4. Autoeficácia por acúmulo de pequenas vitórias
5. O "porquê" pessoal reaparece nos momentos certos

A regra de pré-compromisso do bloqueio de apps (seção 4/5) é o exemplo mais claro de
"fricção sem punição" — a mudança não é impedida, só adiada pro dia seguinte; o usuário
sempre pode desativar o Accessibility Service nas configurações do Android, e o app não
tenta impedir isso.
