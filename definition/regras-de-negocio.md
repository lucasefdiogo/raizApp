# Regras de Negócio — Rootora

> Documento vivo. Consolida `regras-streak-e-textos-mvp.md` + a parte de mecânica de
> `05-fase3.md` — as duas fontes de regra de negócio que antes viviam separadas por
> fase. Terminologia: **"proteção"** é o nome voltado ao usuário do mecanismo antes
> chamado de "escudo" — o nome interno (`escudosDisponiveis`, `variant: 'escudo'`,
> `protegido_escudo`) continua existindo no código e não precisa mudar.

---

## 1. Streak e Proteção

### O que conta como "dia cumprido"
Pelo menos 1 tarefa marcada como essencial concluída no dia (`avaliarDiaCumprido`,
`domain/streak.ts`). Tarefas comuns concluídas, mesmo todas, **não** cumprem o dia: o teto de
3 essenciais existe pra manter o foco em poucas vitórias reais (princípio 4). Dia sem
nenhuma tarefa nunca é cumprido.

A mesma função decide o streak, o histórico de 7 dias, o detalhe do dia e os desafios —
não existe segunda definição. (Até out/2026 o código também aceitava 60% das tarefas
concluídas; a regra foi removida por divergir do que o produto define.)

**Limite de essenciais:** no máximo 3 tarefas essenciais por dia (`LIMITE_TAREFAS_ESSENCIAIS`,
`domain/dailyTasks.ts`). Promover uma tarefa a essencial com o teto atingido é recusado;
rebaixar é sempre livre.

### Sistema de Proteção
| Regra | Valor |
|---|---|
| Proteções disponíveis por semana | 1 |
| Renovação | Toda segunda-feira, automático |
| Acúmulo | Não acumula — expira se não usado |
| Ativação | Automática, sem ação do usuário |
| Efeito | Streak numérico não é zerado; dia perdido fica marcado no histórico de forma neutra |

### Sem proteção disponível
- **1 dia perdido:** streak cai para 50% do valor anterior, arredondado pra baixo, com
  **mínimo de 1** enquanto o streak era maior que 0 (`Math.max(1, Math.floor(x * 0.5))`) —
  um dia isolado nunca zera. Streak 0 continua 0. `diasTotaisAtivos` não muda
- **2+ dias seguidos perdidos** (o app nem foi aberto no intervalo): o streak vai a 0 e,
  no próximo dia cumprido, recomeça em 1. A proteção **não é consultada** nesse caso — ela
  cobre uma falha isolada, não um sumiço de vários dias, mesmo que esteja disponível.
  `diasTotaisAtivos` nunca reseta

### Marcos de celebração
3 · 7 · 14 · 30 · 60 · 90 dias

### Lógica diária (executada ao abrir o app, comparando `ultimoDiaAtivo` com a data atual)
0. Primeiro dia de uso (`ultimoDiaAtivo` vazio): não avalia nada, não consome proteção —
   só grava hoje como ponto de partida (`inicializarPrimeiroDia`)
1. Dia cumprido → `streakAtual += 1`, `diasTotaisAtivos += 1`
2. Dia não cumprido e proteção disponível → consome a proteção, streak mantido,
   `statusDia = 'protegido_escudo'`
3. Dia não cumprido e sem proteção → `streakAtual = max(1, floor(streakAtual * 0.5))`
   (0 se já era 0),
   `statusDia = 'perdido'`
4. 2+ dias seguidos não cumpridos (checado antes dos passos 1–3, sem consultar a
   proteção) → `streakAtual = 0`, `statusStreak = 'pausado'` (dispara
   `ReturnAfterPauseScreen` no próximo acesso)

### Textos do produto — streak/proteção

**Escudo/proteção ativado (dia perdido, protegido):**
> "Ontem não saiu como planejado — e tudo bem. Seu progresso continua de pé. Hoje é um novo dia para agir."

**Streak reduzido (sem proteção):**
> "Você perdeu um dia e isso teve um custo — sua sequência agora está em {{streak}}. Mas {{diasTotais}} dias reais continuam contando. Vamos seguir a partir daqui, não do zero."
> (`{{streak}}` e `{{diasTotais}}` são valores DIFERENTES — sequência pós-queda e total de dias ativos, não o mesmo número repetido)

**Retorno após pausa longa (2+ dias):**
> "Você esteve fora por alguns dias. Isso acontece — não precisa explicar, só decidir o próximo passo. Lembra por que você começou? *[reexibe o "porquê" do onboarding]* Vamos escolher 1 coisa pequena para hoje."

**Dia zerado (nenhuma tarefa feita, sem proteção):** *(texto cadastrado em
`systemMessages/dia_zerado`, mas **ainda não exibido em nenhuma tela** — hoje o dia sem
proteção usa o texto "Streak reduzido" acima)*
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
| "Cumpra sua essencial todo dia" | Semanal | 7 dias com status `cumprido` ou `protegido_escudo` |
| "20 dias ativos esse mês" | Mensal | 20 dias com status `cumprido` ou `protegido_escudo` (hoje entra assim que a essencial é concluída; dia `pendente`, `perdido` ou sem registro não conta) |

**Qual semanal o período recebe:** alterna por paridade da semana (contada a partir de
2024-01-01, uma segunda) — semana par: "Exercite-se 3x"; semana ímpar: "Cumpra sua
essencial todo dia". O mensal é sempre "20 dias ativos". Por isso há 1 semanal + 1
mensal por vez, nunca os dois semanais juntos. "Dia cumprido" nos dois últimos segue a
definição da seção 1.

Progresso é sempre recalculado a partir dos `dailyLogs` reais do período (nunca
incrementado manualmente). Se a meta não for atingida no fim do período, o desafio
expira (`status: 'expirado'`) sem afetar streak ou qualquer outra métrica.

---

## 4. Bloqueio de apps

Sistema antigo (custo crescente por nível, campo `bloqueioApps`, `AppBlockedScreen`)
foi **removido por completo** — nenhuma migração de dado (não havia usuário real).
Hoje existe um único caminho, descrito aqui (configuração) e na seção 5 (motor de
sessões, válvulas de escape e rotina noturna).

### Detecção
**Accessibility Service** (não `UsageStatsManager`+overlay — decisão tomada
priorizando precisão sobre menor escrutínio de loja). Lê só o nome do pacote do app em
primeiro plano (`typeWindowStateChanged`); `canRetrieveWindowContent="false"` — nunca
lê conteúdo de tela.

### Configuração (Perfil → "Bloqueio de apps")
- **Status do serviço** — "Ativo"/"Desativado" + botão "Ativar" quando desativado,
  que leva à divulgação em destaque (ver abaixo) antes de abrir as configurações do
  Android.
- **Lista de apps — só redes sociais.** A tela lista apenas os apps instalados de uma
  lista curada (não mais todo app instalado via `MAIN`/`LAUNCHER` genérico): Instagram,
  TikTok, Kwai, Facebook, X, Threads, Reddit, Pinterest, Snapchat e YouTube — a
  constante vive em `src/domain/`, e o `<queries>` do manifesto declara exatamente
  esses pacotes (nunca `QUERY_ALL_PACKAGES`). Na primeira configuração, todos vêm
  marcados exceto o YouTube (desmarcado, com a dica "Usa para estudar? Pode deixar
  livre."); com `regrasBloqueio` já existente, valem as marcações salvas, sem
  pré-marcação. Sem nenhum app da lista instalado, a tela mostra o estado vazio
  "Nenhuma rede social encontrada neste aparelho." Numa atualização do app, qualquer
  pacote fora da lista curada que já estivesse marcado é removido de `regrasBloqueio`/
  `regrasBloqueioPendentes` na primeira abertura, sem criar pendência.
- **Uma única janela de horário** aplicada a todos os apps selecionados (não por app
  individual): início, fim (precisa ser depois do início — a tela rejeita janela que atravessa a
  meia-noite) e dias da semana. O lado nativo (`BloqueioPrefs.kt`) já sabe avaliar
  janela invertida, e o horário de `fim` é inclusivo; só a configuração não permite criar uma.
- **Resumo em texto** + botão "Salvar" — ver seção 5 pra regra de quando a mudança
  vale imediatamente vs. no dia seguinte.

### Medir tempo nas redes (acesso de uso)
Além da Accessibility Service (detecção/bloqueio), o app lê o `UsageStatsManager` do
Android pra medir quanto tempo e quantas vezes cada rede social da lista curada é
aberta por dia — fonte independente, não participa da interceptação. Entrada "Medir
tempo nas redes" na `BloqueioAppsScreen`, visível enquanto esse acesso estiver
desligado, abre a `DivulgacaoAcessoUsoScreen` (mesmo padrão da divulgação de
acessibilidade abaixo):

> **Medir seu tempo nas redes**
> Para mostrar quanto tempo você passa nas redes sociais, o Rootora usa o acesso de uso
> do Android. Medimos só os apps da lista de redes sociais: tempo de uso e quantas
> vezes cada um foi aberto. Os dados ficam na sua conta e são apagados se você excluir
> a conta.
>
> Botões: "Permitir acesso de uso" · "Agora não"

Consentimento gravado em `users/{uid}.consentimentoAcessoUso` (data), só ao tocar
"Permitir acesso de uso". Sem esse acesso concedido, nada é coletado nem gravado — o
bloqueio de apps continua funcionando normalmente, só sem medir o tempo. Os dados vão
pra `dailyLogs/{data}.usoApps` (ver `schema-firebase.md` seção 3); gravar esse campo
nunca altera streak nem status do dia.

### Aviso de bloqueio desligado
Desligar o Accessibility Service nas configurações do Android é sempre possível e o
app não impede isso — mas registra o desligamento e o religamento (nativo, mesmo com
o app fechado) e agenda até 2 lembretes locais por desligamento: o 1º no dia seguinte
às 09:00 ("Desligado desde ontem. Toque para religar quando quiser."), o 2º três dias
depois, também às 09:00 ("Desligado há alguns dias. Toque para religar quando
quiser."). Religar cancela os lembretes pendentes. Um lembrete só é exibido com o
serviço continuando desligado, `regrasBloqueio` existente, o serviço já ativado ao
menos uma vez e `notificacoesAtivas` verdadeiro; tocar a notificação abre a
`BloqueioAppsScreen`. Os eventos (desligadoEm/religadoEm) são sincronizados pro
Firestore na abertura do app (`dailyLogs/{dia do evento}.acessibilidade`), sem alterar
streak nem status do dia. Nenhum texto desse aviso usa a palavra "proteção".

### Divulgação em destaque do Accessibility Service
Exigência de política da Play Store: tela própria, fora de qualquer menu, mostrada
antes de abrir as configurações de acessibilidade do Android (nunca depois).

> **Como o bloqueio funciona**
> Para interceptar um app, o Rootora usa o serviço de acessibilidade do Android.
> Ele identifica apenas qual app foi aberto, para mostrar a interceptação no lugar dele.
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

## 5. Motor de sessões, válvulas de escape e rotina noturna

Extensão do bloqueio de apps (spec `09-ponte-fuga-tarefa-e-estou-travado.md`): o motor
controla o próprio acesso aos apps bloqueados — quanto tempo, com que frequência, com
que fricção — em vez de depender de cumprir uma tarefa pra liberar. **Único caminho de
interceptação** — `regrasBloqueio` → `InterceptActivity` (schema e tela de
configuração da seção 4).

> **Histórico:** até out/2026 a liberação era condicionada a cumprir a tarefa
> essencial do dia (estados A/B/C da InterceptScreen + saldo de blocos ganho por
> tarefa extra). Em uso real isso levou a desativar o Accessibility Service pra
> acessar algo sem alternativa dentro do app — o motivo da mudança abaixo.

### Sessões com cooldown (substitui a liberação por tarefa)

Sem sessão nem cooldown ativos, abrir um app bloqueado dentro da janela de horário
mostra a **pausa de intenção**: campo de texto opcional ("O que você vai fazer agora?")
e botão "Liberar" desabilitado por uma sequência em segundos — 10, 20, 30, 40, 50 e 60
(teto), pela posição da sessão já liberada no dia (`SEQUENCIA_PAUSA_INTENCAO_SEG_V2`,
fixa no código). Sair da tela reinicia a pausa.

- **Sessão** = `duracaoBlocoMin` (15 min) de uso. O tempo é GLOBAL (soma todos os apps
  bloqueados) e só conta com um app bloqueado em PRIMEIRO PLANO: sai do app ou a tela
  apaga, o contador pausa. Teclado e barra de notificações não contam como "sair". Um
  minuto antes do fim, aviso não bloqueante "1 minuto restante". Ao terminar, a sessão
  encerra **sem oferta de tolerância** (removida, não substituída) e o cooldown começa.
- **Cooldown** — `cooldownMin` (45) em tempo corrido (timestamp absoluto, sobrevive a
  fechar o app e reiniciar). A interceptação mostra a contagem regressiva
  ("próximo acesso em X min"), as válvulas de escape (abaixo) e os atalhos de sempre —
  uma sessão de foco de 5 min sem tarefa, e tarefas extras. Terminado o cooldown, a
  próxima tentativa mostra a pausa de intenção de novo, com a sequência avançando uma
  posição.
- **Saldo diário** — `blocosDiarios` tem padrão "sem limite": terminado um cooldown,
  sempre há uma próxima sessão, sem bloqueio até o dia seguinte. Só quando configurado
  como número (ainda sem tela de edição, só via Firestore) o saldo pode zerar e levar
  a `SALDO_ZERADO` — tela com os mesmos atalhos (sessão de foco de 5 min sem tarefa /
  tarefas extras), sem a pausa de intenção. Uma tarefa extra concluída tira a
  interceptação desse estado.

Máquina de estados (persistida no nativo; `PAUSA_INTENCAO` é só de tela, reinicia ao
sair, por isso não é persistida):
```
AGUARDANDO_LIBERACAO ⇄ PAUSA_INTENCAO → SESSAO_ATIVA → COOLDOWN → (AGUARDANDO_LIBERACAO | SALDO_ZERADO)
SALDO_ZERADO → AGUARDANDO_LIBERACAO (tarefa extra concluída)
qualquer estado → reinicia na virada do dia
```
Fonte da regra: `SaldoBloqueioMaquina.kt` (roda sem JS) com cópia de referência em
`domain/saldoBloqueio.ts`; as duas passam nas mesmas fixtures
(`domain/__fixtures__/saldoBloqueio.json`, lidas por Jest e JUnit).

Configuração em `regrasBloqueio` (todos opcionais, ausente = padrão): `duracaoBlocoMin`
(15), `cooldownMin` (45), `blocosDiarios` ("sem limite"). Seguem a regra de
pré-compromisso abaixo (alteração só vale amanhã) — exceto a migração pontual que
trocou os padrões antigos (sessão 15/tolerância 2/cooldown 30) pelos atuais
imediatamente pra todo usuário, sem pendência. Ainda sem tela de edição.

### Válvulas de escape (acesso rápido e emergência)

Um cooldown de 45 min sem nenhuma saída intermediária recria o motivo de desativar o
serviço — por isso duas válvulas, sempre mais baratas do que desativar o
Accessibility Service:

- **Acesso rápido** — libera 2 minutos (contados globalmente, só em primeiro plano),
  após 5 segundos de espera (sem pausa de intenção). Cota de 3 usos por dia
  (`ACESSOS_RAPIDOS_DIARIOS`, fixo no código, zera à meia-noite); intervalo mínimo
  entre usos contado do fim do anterior: 15 min depois do 1º, 30 min depois do 2º, 60
  min depois do 3º. Disponível também durante o cooldown de uma sessão, sem alterá-lo.
  Sem cota ou dentro do intervalo, a tela mostra "próximo acesso rápido em X min" em
  vez do botão — nunca como negativa.
- **Emergência** — aparece só quando não há sessão, cooldown liberável nem acesso
  rápido disponíveis. Respiração guiada de 60 segundos, sem pular; ao terminar, libera
  2 minutos. Sem limite de usos por dia e sem consumir a cota do acesso rápido.

`resumoBloqueio` grava `sessoesUsadas`, `intencoes` (texto livre), `acessosRapidos` e
`emergencias` — ver `schema-firebase.md` seção 3.

### Rotina estimada e janela noturna

A coleta de uso (acima) grava, por dia, `primeiroUsoDia` (proxy de "acordar") e
`ultimoUsoAntesPausaLonga` (proxy de "dormir"). Com pelo menos 5 dias desses campos no
histórico, o app estima um horário de dormir/acordar — sem pergunta no onboarding — e
oferece, uma vez, uma tela de confirmação (`rotina.confirmadoEm`) seguida de uma
pergunta única e opcional sobre uma alternativa noturna (`rotina.alternativaNoturna`).
Sem confirmação, nada muda na interceptação.

Confirmada, a **janela noturna** vai de 30 min antes de `rotina.dormirEstimado` até
`rotina.acordarEstimado`. Dentro dela: a pausa de intenção dobra a espera da posição
atual (teto 120s) e troca o texto padrão por uma mensagem rotativa do banco `noturno`
(`banco-de-frases.md`), com um botão extra pra alternativa noturna quando cadastrada;
o acesso rápido espera 30s em vez de 5 e mostra a mesma mensagem/botão — cota e
intervalos do acesso rápido não mudam. Fora da janela, tudo segue padrão.

**Onde se ajusta:** Perfil → seção "Rotina" → "Rotina noturna" (`RotinaPerfilScreen`),
uma tela própria — não fica dentro de "Bloqueio de apps". Enquanto `rotina` não existe
no documento do usuário (só é gravada ao confirmar a estimativa), a tela mostra um
texto fixo, sem indicador de progresso da coleta: "A rotina aparece aqui depois de
alguns dias de uso. Não precisa fazer nada por enquanto." Com rotina, a tela permite
editar dormir/acordar e a alternativa noturna. Editar os horários manualmente liga
`rotina.modoManual`, que pausa a reestimativa automática. "Recalcular automaticamente"
(visível só com `modoManual` ligado) apenas grava `rotina.modoManual: false` — não
regrava os horários na hora.

Detalhe completo (regras RN e critérios de aceite) em
`09-ponte-fuga-tarefa-e-estou-travado.md`, seções 3 a 5.

### TravadoFlow — "O que está pegando agora?"
Caminho independente da interceptação, acessível pelas 2 entradas com o **mesmo
componente**: botão discreto abaixo da lista na Home e toque longo numa tarefa
(`TaskCard`/`TaskItem`). 4 chips de toque único:

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
conclusão da tarefa essencial conta (regra "dia cumprido" da seção 1, inalterada).
Evita que o timer vire atalho e esvazie o significado do streak.

### Regra de pré-compromisso (regra única — ver spec 09, seção 8)
A primeira configuração de `regrasBloqueio` vale na hora. **Qualquer alteração depois
disso** — inclusive desativar o bloqueio — só vale a partir do dia seguinte
(`regrasBloqueioPendentes.efetivaEm`), sem distinguir se a mudança afrouxa ou endurece.
Uma nova alteração enquanto já existe uma pendente substitui a pendente. A promoção
pendente→vigente acontece no lado nativo (Kotlin, `BloqueioPrefs`), não no JS — roda
mesmo com o app fechado; na próxima abertura, o RN sincroniza o resultado de volta no
Firestore (`useSincronizarRegrasBloqueio`). Lógica pura testada em
`aplicarRegrasBloqueioPendentesSeVencidas`/`decidirGravacaoRegrasBloqueio`
(`domain/appBlock.ts`).

**Efeito colateral importante, validado em teste de campo:** o `regrasBloqueio` vigente
fica espelhado em SharedPreferences nativo, que sobrevive a fechar o app/forçar parada
— só reseta ao desinstalar. Então tocar "Salvar" numa alteração (ex: desmarcar um app)
não para a interceptação na hora, e fechar/reabrir o app também não ajuda; a única
saída imediata é desativar o Accessibility Service nas Configurações do Android (ver
seção acima). Pra ninguém ser pego de surpresa por isso — já aconteceu um usuário
precisar desinstalar o app por não entender por que a interceptação continuava — a
tela de bloqueio mostra `AvisoAlteracaoPendenteScreen` **antes** de gravar qualquer
alteração que viraria pendente (nunca na primeira configuração, só muda ou não existe
nada "sendo afrouxado" ainda). A tela:
- Reconhece o momento sem culpa ("a vontade de soltar o bloqueio... é só o momento
  falando") — princípio 3 (recaída sem vergonha)
- Explica o mecanismo e mostra os dois resumos lado a lado: "Hoje continua" (regras
  vigentes) e "A partir de amanhã" (o que o usuário acabou de configurar)
- "Entendi, confirmar" grava de fato (vira pendente); "Voltar e revisar" só volta pra
  edição, sem gravar nada

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
