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
> "Você perdeu um dia e isso teve um custo — seu streak caiu para {{streak}}. Mas {{diasTotais}} dias reais continuam contando. Vamos seguir a partir daqui, não do zero."
> (`{{streak}}` e `{{diasTotais}}` são valores DIFERENTES — streak pós-queda e total de dias ativos, não o mesmo número repetido)

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

### Configuração
Uma única janela de horário aplicada a todos os apps selecionados (não por app
individual). Detecção via **Accessibility Service** (não `UsageStatsManager`+overlay —
decisão tomada priorizando precisão sobre menor escrutínio de loja).

### Mecanismos de desbloqueio
1. **Tarefas essenciais concluídas** — desbloqueio imediato se já cumpridas no dia
2. **Pausa de respiração** — timer que não pode ser pulado nem acelerado

Nenhum dos dois envolve Health Connect/calorias ainda (📋 planejado, ver
`roadmap-e-status.md`).

### Custo crescente (desestimular abuso, sem virar punitivo)
Contagem: **total do dia**, somando todos os apps bloqueados juntos (não por app —
evita que o usuário alterne de app pra manter cada um "barato"). O que escala é a
**exigência**, nunca a duração da liberação (sempre 15 minutos por desbloqueio bem-
sucedido, em qualquer nível).

| Nível | Quando | Respiração | Tarefas essenciais |
|---|---|---|---|
| 1 | 1º desbloqueio do dia | 60s | Desbloqueio imediato se já concluídas |
| 2 | 2º desbloqueio do dia | 90s | Exige reflexão escrita adicional ("O que você vai fazer agora no {app}?") |
| 3 (teto) | 3º desbloqueio em diante | 120s | Mesma reflexão do nível 2 — não escala mais |

Reset diário (natural, por já usar `dailyLogs/{data}.desbloqueiosApps`).

### Permissões — o que dizer ao usuário
Ver `AccessibilityPrimingScreen`/`NotificationPrimingScreen` — texto fixo, honesto
sobre o que a Accessibility Service vê (só o nome do app aberto) e não vê (conteúdo de
tela, dados pessoais).

---

## 5. Princípios que regem qualquer regra nova

Antes de adicionar ou ajustar qualquer mecânica (streak, desafio, bloqueio ou o que vier
depois), checar contra os 5 princípios do produto (`CLAUDE.md`):
1. Reduzir a ameaça percebida da tarefa, nunca aumentar cobrança
2. Comunicação honesta — nunca prometer efeito neurológico que não existe
3. Recaída sem vergonha — fricção crescente é aceitável, punição não
4. Autoeficácia por acúmulo de pequenas vitórias
5. O "porquê" pessoal reaparece nos momentos certos

O sistema de escalação do bloqueio de apps é o exemplo mais claro de "fricção sem
punição" — exigência sobe, mas tem teto; nunca vira impossível.
