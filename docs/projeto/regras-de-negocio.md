# Regras de Negócio — Rootora

> **Fonte única das regras de negócio do app.** Consolida o antigo `definition/regras-de-negocio.md`,
> a spec de interceptação (`09-ponte-fuga-tarefa-e-estou-travado.md`), a seção de regras do
> `spec.md` e as regras (RN) das HUs 01 a 14, todas já implementadas. Os arquivos de origem
> foram apagados em 2026-10-24. Daqui em diante, toda mudança de regra é feita **aqui**, no
> mesmo commit/branch do código que a implementa.
>
> Terminologia: **"proteção"** é o nome ao usuário do mecanismo que no código e no Firestore
> continua se chamando "escudo" (`escudosDisponiveis`, `protegido_escudo`, `variant: 'escudo'`).
>
> Testes antigos citam HUs (`HU-07 · Cenário 3`, `CA-nn:`): a HU de origem aparece entre
> parênteses nos títulos abaixo só para rastrear esses testes.

---

## 0. Princípios que regem qualquer regra

Toda regra nova ou alterada é checada contra os 5 princípios do produto (detalhe em `spec.md`):

1. Reduzir a ameaça percebida da tarefa, nunca aumentar cobrança
2. Comunicação honesta: nunca prometer "resetar o cérebro" ou "esvaziar dopamina"
3. Recaída sem vergonha: fricção é aceitável, punição não
4. Autoeficácia por acúmulo de pequenas vitórias: desconfiar de gamificação vazia
5. O "porquê" pessoal reaparece nos momentos de recaída/retorno

**Regras de texto válidas para todas as seções:** frases curtas, verbo no início; sem ponto de
exclamação, sem tom de cobrança, sem pedido de desculpas, sem emoji (exceto o 🌱 do badge);
a palavra "proteção" só é usada no contexto do streak; "streak" e "check-in" não aparecem em
texto exibido; "bloqueado" nunca é título; nenhuma tela mostra mais de um elemento Cobre
(a cor de ação principal).

**Sem efeito colateral cruzado:** ler/exibir uso de redes, sessões, válvulas, janela noturna,
rotina e sessões de foco **nunca** altera `streakAtual`, `statusDia`, proteção ou desafios.
Só a conclusão de tarefa essencial mexe no streak.

---

## 1. Streak e proteção

### Dia cumprido
- Pelo menos **1 tarefa essencial concluída** no dia (`avaliarDiaCumprido`, `domain/streak.ts`).
  Tarefas comuns, mesmo todas concluídas, não cumprem o dia. Dia sem tarefa nunca é cumprido.
- A mesma função decide streak, histórico de 7 dias, detalhe do dia e desafios — não existe
  segunda definição. (A antiga regra de "60% das tarefas" foi removida.)
- Concluir uma essencial na Home **é** o check-in do dia; não existe tela de check-in.

### Limite de essenciais
- No máximo **3 essenciais por dia** (`LIMITE_TAREFAS_ESSENCIAIS`, `domain/dailyTasks.ts`).
  Promover com o teto atingido é recusado; rebaixar é sempre livre.

### Proteção
| Regra | Valor |
|---|---|
| Proteções por semana | 1 |
| Renovação | Toda segunda-feira, automática |
| Acúmulo | Não acumula — expira se não usada |
| Ativação | Automática |
| Efeito | Streak não é zerado; o dia perdido fica marcado de forma neutra no histórico |

A contagem de proteções **não é exibida na Home** desde a HU-07 (o rodapé do `StreakCard` mostra
a garantia do dia). `escudosDisponiveis` continua no Firestore. Onde/se voltar a mostrar a
contagem é decisão em aberto (seção 14).

### Sem proteção
- **1 dia perdido:** streak = `Math.max(1, Math.floor(streak * 0.5))` enquanto streak > 0
  (um dia isolado nunca zera). Streak 0 continua 0. `diasTotaisAtivos` não muda.
- **2+ dias seguidos perdidos** (app nem aberto no intervalo): streak vai a 0 e recomeça em 1 no
  próximo dia cumprido. A proteção **não é consultada** nesse caso. `diasTotaisAtivos` nunca reseta.

### Lógica diária (ao abrir o app, comparando `ultimoDiaAtivo` com hoje)
0. Primeiro dia (`ultimoDiaAtivo` vazio): só grava hoje como ponto de partida
   (`inicializarPrimeiroDia`), não avalia nem consome proteção.
1. 2+ dias seguidos não cumpridos (checado antes dos demais): `streakAtual = 0`,
   `statusStreak = 'pausado'` → `ReturnAfterPauseScreen` no próximo acesso.
2. Dia cumprido: `streakAtual += 1`, `diasTotaisAtivos += 1`.
3. Não cumprido + proteção disponível: consome a proteção, streak mantido,
   `statusDia = 'protegido_escudo'`.
4. Não cumprido + sem proteção: `streakAtual = max(1, floor(streakAtual * 0.5))` (0 se já era 0),
   `statusDia = 'perdido'`.

### Marcos de celebração
3 · 7 · 14 · 30 · 60 · 90 dias (`StreakMilestoneModal`; textos no seed de `phrases`/`systemMessages`).

### Textos exatos (preservar literalmente)
- **Proteção ativada:** "Ontem não saiu como planejado — e tudo bem. Seu progresso continua de pé. Hoje é um novo dia para agir."
- **Streak reduzido:** "Você perdeu um dia e isso teve um custo — sua sequência agora está em {{streak}}. Mas {{diasTotais}} dias reais continuam contando. Vamos seguir a partir daqui, não do zero." (`{{streak}}` e `{{diasTotais}}` são valores diferentes.)
- **Retorno após pausa (2+ dias):** "Você esteve fora por alguns dias. Isso acontece — não precisa explicar, só decidir o próximo passo. Lembra por que você começou? *[reexibe o porquê do onboarding]* Vamos escolher 1 coisa pequena para hoje."
- **Dia zerado** (cadastrado em `systemMessages/dia_zerado`, **ainda não exibido em nenhuma tela**): "Hoje não rolou, e tudo bem — um dia não define o processo. Amanhã é uma página nova, não uma dívida a pagar."

---

## 2. Home — tarefas como alternativa à rolagem (HU-07, HU-14)

- Headline da seção de tarefas: "O que você vai fazer no lugar da rolagem hoje?".
- Abaixo, placar em Space Mono: "ESSENCIAIS · {feitas} DE {total} FEITAS"; sem essencial no dia:
  "MARQUE ATÉ 3 COMO ESSENCIAIS".
- Com o dia cumprido (`hojeCumprido`): headline "Hoje já conta. O resto é bônus.", apoio
  "Se a vontade de abrir o feed aparecer, escolha uma daqui.", placar some; rodapé do
  `StreakCard` "Hoje já está garantido" (Cobre Claro). Sem dia cumprido: "Conclua 1 essencial
  para garantir hoje" (Musgo Claro).
- Botão "Adicionar alternativa" abre o `AddTaskForm` como bottom sheet: título "Nova alternativa",
  placeholder "O que você faria em vez de abrir o feed?".
- Chips de sugestão, nesta ordem: "Ler 10 páginas", "Caminhar 15 min", "Alongar 5 min",
  "Arrumar a mesa". Com `rotina.alternativaNoturna`, ela vem como primeiro chip (borda Musgo).
  Tocar num chip só preenche o título; a tarefa só é criada em "Adicionar".
- Toggles "Essencial", "É exercício" e "Repetir todos os dias" vêm desligados. "Essencial" mostra
  "{n} de 3 usadas hoje"; com 3 já no dia, não liga e mostra "Você já tem 3 essenciais hoje.".
- Dia sem tarefa: `EmptyState` com o broto, "Nada planejado ainda" / "Escolha uma coisa pequena
  para fazer no lugar da rolagem.", única ação a linha tracejada "Adicionar alternativa"
  (sem `PrimaryButton`).
- "Estou travado" (botão discreto abaixo da lista), toque longo na tarefa (→ TravadoFlow),
  recorrência (↻), tipo exercício e overlays (`TaskCompletedOverlay`, `RootWateringOverlay`,
  `StreakMilestoneModal`) seguem como estão.
- **Banner de cooldown:** com o motor em `COOLDOWN`, card no topo da Home (entre cabeçalho e lista)
  "Próxima sessão em {N} min", lido do estado nativo ao abrir/focar a tela e atualizado a cada
  1 min só enquanto a Home está em foco. Some quando o estado sai de `COOLDOWN`. Sem escrita no
  Firestore, sem dado pessoal.

---

## 3. Tarefas recorrentes

- Qualquer tarefa pode ser criada com "Repetir todos os dias" → documento em `essentialTasks`
  além da tarefa do dia.
- Todo `dailyLog` novo nasce pré-populado com as `essentialTasks` ativas.
- "Remover só hoje" não afeta a recorrência futura.
- "Parar de repetir" desativa (`ativa: false`) sem apagar o histórico já gerado.

---

## 4. Desafios semanais e mensais

Catálogo fixo — o usuário não cria nem escolhe. Um semanal + um mensal ativos por vez, gerados
automaticamente no início do período (segunda-feira / dia 1).

| Desafio | Período | Meta |
|---|---|---|
| "Exercite-se 3x essa semana" | Semanal (semanas pares) | 3 tarefas `tipo: 'exercicio'` concluídas |
| "Cumpra sua essencial todo dia" | Semanal (semanas ímpares) | 7 dias `cumprido` ou `protegido_escudo` |
| "20 dias ativos esse mês" | Mensal | 20 dias `cumprido` ou `protegido_escudo` |

- Paridade da semana contada a partir de 2024-01-01 (uma segunda).
- Hoje entra no mensal assim que a essencial é concluída; dia `pendente`, `perdido` ou sem
  registro não conta.
- Progresso sempre recalculado dos `dailyLogs` reais, nunca incrementado manualmente.
- Meta não atingida no fim do período → `status: 'expirado'`, sem afetar nada mais.

### Desafio de redução de tempo nas redes

Terceiro desafio, opcional e fora do catálogo fixo acima — proposto dentro da
`ReflexaoSemanalSheet` (seção 5), nunca digitado pelo usuário. Lógica pura em
`domain/desafioReducao.ts`, orquestrada por `hooks/useDesafioReducao.ts`.

- **Elegibilidade** (as 4 precisam valer): a reflexão já está aparecendo; o tempo bloqueado da
  semana anterior é ≥ 1h; não há desafio de redução ativo; a proposta desta semana ainda não foi
  respondida (aceite cria o desafio; recusa grava a semana em AsyncStorage e não volta).
- **Base:** tempo bloqueado (mesmo filtro do card) da semana anterior. 7 dias com `usoApps` →
  soma; 4-6 dias → média dos dias com dado × 7. Um dia sem `usoApps` nunca conta como zero (fora
  da média).
- **Meta:** base × 0,9, arredondada pra baixo ao múltiplo de 5 min mais próximo (ex.: base
  6h20min → meta 5h40min).
- **Progresso:** sempre recalculado do `usoApps` da semana, filtrado pelos apps bloqueados
  atuais — nunca incrementado. Sem acesso de uso (revogado no meio da semana), o progresso
  congela no último valor e o card mostra "Sem medição desde {dia da semana}".
- **Fechamento** (ao abrir o app depois de `dataFim`): progresso ≤ meta → `concluido`; senão →
  `expirado` (também `expirado`, sem texto de resultado, se congelou por falta de acesso de uso).
  Se a semana anterior fechou `concluido`, a próxima reflexão mostra "Você fechou a semana
  passada dentro do combinado." acima do título; se `expirado`, não diz nada sobre isso.
- Ultrapassar a meta antes do fim da semana não fecha o desafio nem muda a cor da barra — só
  troca o texto por "Passou do combinado desta semana. Na segunda tem outra proposta.".
- Convive com o catálogo sem interferir: `useDesafios` filtra `tipo: 'reducao_tempo_redes'` fora
  do pool de desafios automáticos (não entra na regra de 1 semanal + 1 mensal, nem é fechado por
  `calcularProgressoDesafio`).
- Analytics: `desafio_reducao_proposto`, `desafio_reducao_respondido` (`acao`), `desafio_reducao_fechado`
  (`resultado`) — nenhum parâmetro leva tempo de uso, meta, base ou nome de app.

---

## 5. Progresso — tempo nas redes e reflexão da semana (HU-08, HU-13)

### Período e fontes
- Semana = segunda a domingo, pela data local dos `dailyLogs`. O card mostra a semana corrente
  até hoje; comparação e reflexão usam a semana anterior completa (lê no máximo 14 documentos).
- Contadores somam `resumoBloqueio.sessoesUsadas`, `.acessosRapidos` e `.emergencias`.
- Tempo soma `usoApps[packageName].segundos`, ignorando `primeiroUsoDia` e
  `ultimoUsoAntesPausaLonga`. Documento/campo ausente conta zero.
- **Filtro:** só entram os pacotes em `regrasBloqueio.apps` **vigente no momento em que a tela
  abre** — nunca a lista curada inteira, nem a lista de cada dia histórico. Desmarcar um app o
  tira do card e do detalhe de qualquer dia (o dado continua em `usoApps`). Nenhum `dailyLog` é
  reescrito.
- Pacotes do mesmo app somam sob o nome da lista curada (os 2 do TikTok → "TikTok"; Facebook e
  Facebook Lite → "Facebook").

### `ResumoRedesCard`
- **Com acesso de uso** (`consentimentoAcessoUso`): eyebrow "REDES SOCIAIS · ESTA SEMANA", tempo
  total, lista por app do maior para o menor ("Instagram 4h10min · TikTok 2h30min" — não aparece
  com só 1 app bloqueado), 7 barras seg–dom proporcionais ao maior dia (sem dado = vazia; hoje =
  tracejada) e os contadores "SESSÕES", "ACESSOS RÁPIDOS", "EMERGÊNCIAS".
- **Sem acesso de uso, ou sem nenhum app bloqueado:** eyebrow "BLOQUEIO · ESTA SEMANA", só os
  contadores, e "Quer ver quanto tempo passa nas redes?" com link "Medir tempo"
  (→ `DivulgacaoAcessoUsoScreen`). Nenhum dado de uso é lido.
- Duração: horas e minutos arredondados para baixo ("6h 40min", "52 min", "1h"); < 1 min:
  "menos de 1 min"; nada medido: "0 min".
- Comparação: só se a semana anterior tiver ≥ 4 dias com `usoApps`. Diferença < 5 min: "Quase
  igual à semana passada"; queda: "{duração} a menos que a semana passada"; alta: "{duração} a
  mais que a semana passada". Mesma cor neutra (Terra Suave), sem adjetivo nem seta.

### Detalhe do dia (`DayDetailSheet`)
- Com `resumoBloqueio` ou `usoApps` no dia, bloco "NAS REDES": tempo do dia (só com acesso de
  uso), "{n} sessões · {n} acesso rápido" (+ "· {n} emergência" se > 0), **todos** os apps
  bloqueados com tempo no dia, e as intenções sob "O QUE VOCÊ ESCREVEU NA PAUSA".
- Intenções: entre aspas, na ordem escrita, ignorando vazias, até 5; acima disso "+{n}". Só
  aparecem aqui, para a própria pessoa — nunca em Analytics, logs ou outro lugar.

### `ReflexaoSemanalSheet`
- Abre uma única vez, na primeira abertura do Progresso a partir de segunda, se houver acesso de
  uso e a semana anterior tiver ≥ 4 dias com `usoApps`. Usa a lista curada inteira (não o filtro
  de apps bloqueados).
- Conteúdo: eyebrow "SEMANA DE {dd} A {dd} DE {mês}", título "Sua semana nas redes", frase com
  total + comparação (quando houver base) + app principal ("O {app} ficou com mais da metade." se
  > 50%, senão "O {app} foi o que mais ocupou."), e 3 números: média por dia, dia mais longo
  ("qui") e total de aberturas. "Entendi" e "Agora não" só fecham.
- Controle: semana já mostrada em AsyncStorage `reflexao_semanal_vista` (data da segunda).
- Quando elegível, mostra também a proposta do desafio de redução de tempo nas redes — ver
  seção 4, "Desafio de redução de tempo nas redes".

### Privacidade e tom
- Nenhum número revela horário de dormir/acordar (`primeiroUsoDia`, `ultimoUsoAntesPausaLonga` e
  `rotina` não são exibidos nem usados no cálculo).
- Sem ranking, sem comparação com outras pessoas, sem "demais", "excesso", "melhorou", "piorou".

---

## 6. Bloqueio de apps — configuração

O sistema antigo (custo crescente por nível, `bloqueioApps`, `AppBlockedScreen`) foi removido.
Caminho único: configuração (esta seção) → motor de sessões (seção 7).

### Detecção
- **Accessibility Service** (não `UsageStatsManager` + overlay — precisão acima de menor
  escrutínio de loja). Lê só o nome do pacote em primeiro plano (`typeWindowStateChanged`);
  `canRetrieveWindowContent="false"`, nunca lê conteúdo de tela.

### Lista de apps
- Só redes sociais de uma lista curada (constante em `src/domain/`): Instagram, TikTok, Kwai,
  Facebook, X, Threads, Reddit, Pinterest, Snapchat, YouTube. O `<queries>` do manifesto declara
  exatamente esses pacotes — nunca `QUERY_ALL_PACKAGES`.
- 1ª configuração: todos marcados exceto YouTube, com a dica "Usa para estudar? Pode deixar livre.".
  Com `regrasBloqueio` existente, valem as marcações salvas.
- Nenhum app da lista instalado: "Nenhuma rede social encontrada neste aparelho."
- Numa atualização do app, pacote fora da lista curada que estivesse marcado é removido de
  `regrasBloqueio`/`regrasBloqueioPendentes` na primeira abertura, sem criar pendência.

### Janela de horário (HU-12)
- Uma única janela para todos os apps: seletor "O dia todo" / "Horário específico" + dias da semana.
- "O dia todo" grava `janelas: [{inicio: "00:00", fim: "23:59", diasSemana}]` (mesmo formato, sem
  campo novo) e esconde os campos de hora. Vem pré-selecionado só na 1ª configuração.
- "Horário específico": início e fim, fim depois do início (a tela não deixa atravessar a meia-noite;
  o nativo `BloqueioPrefs.kt` sabe avaliar janela invertida e trata `fim` como inclusivo).
- A tela não indica qual opção é "melhor" nem usa "recomendado".

### Regra de pré-compromisso (regra única)
- A **1ª configuração** de `regrasBloqueio` vale na hora.
- **Qualquer alteração depois** — inclusive desativar, trocar "dia todo"/"horário", apps,
  dias — só vale no dia seguinte (`regrasBloqueioPendentes.efetivaEm`), sem distinguir se afrouxa
  ou endurece. Nova alteração substitui a pendente.
- Promoção pendente→vigente no nativo (Kotlin, `BloqueioPrefs`), mesmo com o app fechado; na
  abertura seguinte o RN sincroniza no Firestore (`useSincronizarRegrasBloqueio`). Lógica pura:
  `aplicarRegrasBloqueioPendentesSeVencidas` / `decidirGravacaoRegrasBloqueio` (`domain/appBlock.ts`).
- O `regrasBloqueio` vigente fica espelhado em SharedPreferences (sobrevive a fechar o app e a
  forçar parada; só reseta ao desinstalar). Salvar uma alteração **não** para a interceptação
  hoje; a única saída imediata é desligar o Accessibility Service no Android — o app não impede.
- Exceção pontual histórica: a migração dos padrões de sessão (15/45, sem tolerância) valeu na
  hora para todos, sem pendência. Não é regra permanente.

### `AvisoAlteracaoPendenteScreen`
- Mostrada **antes** de gravar qualquer alteração que viraria pendente (nunca na 1ª configuração).
- Título "Antes de salvar"; reconhece o momento sem culpa ("a vontade de soltar o bloqueio... é só
  o momento falando"); dois resumos lado a lado "HOJE CONTINUA" / "A PARTIR DE AMANHÃ"
  (`resumoCurtoBloqueio`); linha com ícone `Info`: "Precisa parar agora? Dá para desligar o
  serviço nas configurações de acessibilidade do Android, a qualquer momento." (só texto, sem link).
- "Entendi, confirmar" grava como pendente e mostra o toast "Anotado. A nova regra começa amanhã.";
  "Voltar e revisar" volta sem gravar.

### `BloqueioAppsScreen` (HU-09)
- Seções com eyebrow, nesta ordem: Status do serviço → QUANDO → APPS → SESSÕES → ROTINA NOTURNA
  → MEDIR TEMPO NAS REDES (só com acesso de uso desligado) → resumo em texto + "Salvar".
- **Status:** card com selo "ATIVO" (ponto Musgo) ou "DESATIVADO" (ponto Terra Suave), por
  `useAccessibilityPermission`; link "Saiba o que é" sempre visível. Ativo: "O serviço de
  acessibilidade está interceptando os apps abaixo.". Desativado: "Sem ele, o Rootora não consegue
  interceptar os apps abaixo." + botão "Ativar". Ambos levam à `DivulgacaoAcessibilidadeScreen`.
- **Quando / Apps:** dia selecionado em Terra Escura com letra Casca; caixa marcada em Musgo com ✓.
  Dias e caixas nunca usam Cobre. Busca por nome na lista.
- **Sessões (só leitura):** "{duracaoBlocoMin} min" DE USO, "{cooldownMin} min" DE PAUSA,
  "{ACESSOS_RAPIDOS_DIARIOS}x" ACESSO RÁPIDO (padrões 15/45/3); com `blocosDiarios` numérico,
  "Até {n} sessões por dia.". Link "Como funciona" abre sheet: "Antes de cada sessão, uma pausa
  curta pergunta o que você vai fazer. Cada sessão dá {duracaoBlocoMin} minutos de uso, contados só
  com a rede aberta. Depois vem uma pausa de {cooldownMin} minutos. Durante a pausa, o acesso
  rápido libera 2 minutos, até {ACESSOS_RAPIDOS_DIARIOS} vezes por dia." + "Entendi".
- **Rotina noturna:** ícone de lua, `resumoRotina` forma longa, link "Editar" → `RotinaPerfilScreen`;
  com rotina confirmada, "Pausa maior entre {dormir − 30 min} e {acordar}". Não edita a rotina.
- **Alteração pendente:** banner no topo (só borda Terra Suave) com eyebrow "VALE A PARTIR DE
  AMANHÃ", `resumoCurtoBloqueio` da pendente e "Cancelar alteração" (apaga a pendência na hora).
  A edição parte da regra pendente.

### Resumos (funções puras em `domain/`)
- `resumoCurtoBloqueio(regras)`: "{n} apps · {dias} · {início}–{fim}" — "1 app"; dias contínuos
  "seg a sex", todos "todos os dias", soltos "seg, qua, sex"; janela `00:00–23:59` vira
  "o dia todo" (ex.: "5 apps · seg a sex · o dia todo"). O mesmo vale para `resumoRegrasBloqueio`
  (texto longo do rodapé).
- `resumoRotina(rotina, diasComDados, acessoUso, forma)` (`domain/rotina.ts`), em ordem: rotina
  confirmada → "Dormir {dormir} · Acordar {acordar}" (longa) / "{dormir} – {acordar}" (curta);
  sem acesso de uso → "Precisa medir o tempo nas redes"; < 5 dias com dados → "Aprendendo seu
  horário · {n} de 5 dias"; ≥ 5 dias sem confirmação → "Pronta para confirmar".

### Medir tempo nas redes (acesso de uso)
- `UsageStatsManager`, independente da interceptação: tempo e aberturas por app da lista curada.
- Entrada "Medir tempo nas redes" (visível com o acesso desligado) → `DivulgacaoAcessoUsoScreen`:
  > **Medir seu tempo nas redes** — Para mostrar quanto tempo você passa nas redes sociais, o
  > Rootora usa o acesso de uso do Android. Medimos só os apps da lista de redes sociais: tempo de
  > uso e quantas vezes cada um foi aberto. Os dados ficam na sua conta e são apagados se você
  > excluir a conta. — Botões: "Permitir acesso de uso" · "Agora não"
- `consentimentoAcessoUso` (data) só ao tocar "Permitir acesso de uso". Sem ele nada é coletado e
  o bloqueio funciona normalmente.
- Grava em `dailyLogs/{data}.usoApps` `{segundos, aberturas}` por pacote + `primeiroUsoDia` e
  `ultimoUsoAntesPausaLonga` (último uso antes de 3h+ sem evento), ISO 8601 local, uma vez por dia
  (`agregarUsoPorDia`). Um `dailyLog` que existe só por `usoApps` equivale, no Progresso, a não existir.

### Divulgação em destaque do Accessibility Service
- Exigência da Play Store: tela própria, mostrada **antes** de abrir as configurações de
  acessibilidade do Android:
  > **Como o bloqueio funciona** — Para interceptar um app, o Rootora usa o serviço de
  > acessibilidade do Android. Ele identifica apenas qual app foi aberto, para mostrar a
  > interceptação no lugar dele. Não lê o que você digita e não vê o conteúdo das telas. O Rootora
  > registra quais apps foram interceptados e quando. — Botões: "Concordo e quero ativar" · "Agora não"
- `consentimentoAcessibilidade` (data) só ao tocar "Concordo e quero ativar".
- **Modo informativo** (serviço já ativo, via "Saiba o que é"): mesmo conteúdo, selo "ATIVO",
  parágrafo dizendo que dá para desativar nas configurações do Android, botão "Entendi" (fecha) e
  link "Abrir configurações do Android". Nesse modo **nunca** grava/sobrescreve
  `consentimentoAcessibilidade`. O layout segue o status real do serviço, reavaliado quando o app
  volta ao primeiro plano.

### Aviso de bloqueio desligado
- Desligar o serviço é sempre possível. O nativo registra desligamento/religamento (mesmo com o app
  fechado) e agenda até 2 lembretes locais por desligamento: dia seguinte 09:00 ("Desligado desde
  ontem. Toque para religar quando quiser.") e 3 dias depois 09:00 ("Desligado há alguns dias.
  Toque para religar quando quiser."). Religar cancela os pendentes.
- Só exibe com o serviço ainda desligado, `regrasBloqueio` existente, serviço já ativado ao menos
  uma vez e `notificacoesAtivas`. Toque abre a `BloqueioAppsScreen`.
- Eventos sincronizados na abertura em `dailyLogs/{dia}.acessibilidade`. Nenhum texto usa "proteção".

---

## 7. Interceptação — motor de sessões e válvulas de escape

Único caminho: `regrasBloqueio` → `AccessibilityService` (`deveInterceptar`) → `InterceptActivity`,
que monta o root RN separado `'Intercept'` (fora do `RootNavigator`). Sessões ficam disponíveis
desde o início do dia; o motor controla tempo, frequência e fricção, sempre deixando uma saída
mais barata do que desligar o serviço. (Histórico: a liberação condicionada a cumprir a tarefa
essencial levava a desligar o serviço e foi removida.)

### Máquina de estados
```
AGUARDANDO_LIBERACAO ⇄ PAUSA_INTENCAO → SESSAO_ATIVA → COOLDOWN → (AGUARDANDO_LIBERACAO | SALDO_ZERADO)
SALDO_ZERADO → AGUARDANDO_LIBERACAO (tarefa extra concluída)
qualquer estado → reinicia em AGUARDANDO_LIBERACAO na virada do dia
```
- Autoridade: `SaldoBloqueioMaquina.kt` (roda sem JS); cópia de referência em
  `domain/saldoBloqueio.ts`; mesmas fixtures (`domain/__fixtures__/saldoBloqueio.json`, Jest e JUnit).
- `PAUSA_INTENCAO` é só de tela (reinicia ao sair) e não é persistida.
- Configuração em `regrasBloqueio`, opcionais (ausente = padrão): `duracaoBlocoMin` (15),
  `cooldownMin` (45), `blocosDiarios` ("sem limite"). Seguem o pré-compromisso. Sem tela de edição.

### Estrutura comum das telas (HU-11)
- Ordem: `AppChip` (ícone + nome do app) → eyebrow do estado → headline Zilla → conteúdo → ação
  principal → "OUTRAS SAÍDAS" (quando houver válvula) → link "Sair" (tela inicial do Android —
  o label é "Sair", não "Voltar ao início", pra não sugerir que volta pra dentro do Rootora).
- `ValvulaRow`: card Areia; ícone em círculo com borda Musgo (zap = acesso rápido, wind =
  emergência, timer = sessão de foco, list-checks = tarefas extras), título, descrição, meta em
  Space Mono. Indisponível: esmaecido, "Próximo disponível em {n} min", meta "EM {n} MIN".
  **Nunca** texto de negativa ("bloqueado", "acabou", "não pode") nem cor Cobre.
- No máximo 1 Cobre por tela (o botão "Liberar" habilitado). Contagens em Terra Escura; barra e
  ícones em Musgo.

### Pausa de intenção
- Sem sessão nem cooldown, abrir app bloqueado dentro da janela → pausa: eyebrow "{n}ª SESSÃO HOJE",
  headline "O que você vai fazer agora?", campo opcional (placeholder "Opcional. Ex.: responder a
  turma"), linha "Uma pausa curta antes de abrir. Se sair desta tela, ela recomeça.".
- Espera pela posição da sessão no dia (`SEQUENCIA_PAUSA_INTENCAO_SEG_V2`):

  | Posição | 1ª | 2ª | 3ª | 4ª | 5ª | 6ª+ |
  |---|---|---|---|---|---|---|
  | Normal | 10s | 20s | 30s | 40s | 50s | 60s |
  | Janela noturna | 20s | 40s | 60s | 80s | 100s | 120s |

- Durante a espera o botão fica desabilitado com "Liberar em {m:ss}"; ao zerar vira
  `PrimaryButton` "Liberar {duracaoBlocoMin} min". Não há outro timer na tela.
- Na janela noturna: ver seção 8.

### Alternativa do dia (pausa e espera do acesso rápido)
- Fora da janela noturna, a pausa de intenção e a espera do acesso rápido podem mostrar o mesmo
  botão da alternativa noturna (`SecondaryButton` com ícone de livro, "{título} em vez disso"),
  oferecendo uma tarefa de hoje em vez da alternativa noturna. Nunca no cooldown (já tem "Tarefas
  extras"), saldo zerado, emergência ou sessão ativa.
- Tarefa escolhida entre as de hoje não concluídas (subtarefas incluídas): essenciais pendentes
  primeiro, na ordem da Home; sem essencial pendente, as comuns pendentes. Dentro do grupo,
  rotaciona pela posição da sessão no dia — `índice = (posição - 1) mod tamanho do grupo`, mesma
  posição do "{n}ª SESSÃO HOJE". Sem tarefa pendente, nenhum botão aparece — nunca sugestão
  genérica.
- Título cortado em 32 caracteres no último espaço antes do limite, com "…"; sem espaço antes do
  limite, corta em 32 caracteres mesmo assim. O botão fica habilitado desde o início da espera —
  a alternativa nunca espera a contagem — e nunca usa Cobre.
- Toque: fecha a pausa sem liberar a sessão, abre a sessão de foco de 5 min com essa tarefa
  (`origem: 'interceptacao'`). Não avança a posição da sessão no dia. No acesso rápido, cancela
  sem gastar a cota. Concluir a tarefa pela sessão segue as regras normais (essencial cumpre o
  dia).

### Sessão
- `duracaoBlocoMin` (15 min), tempo **global** (soma dos apps bloqueados), só conta com app
  bloqueado em **primeiro plano**; sair do app ou apagar a tela pausa. Teclado e barra de
  notificações não contam como saída.
- **Notificação** (HU-14): postada pelo nativo só em `SESSAO_ATIVA`, `ongoing` (não sai com swipe),
  texto "Sessão em andamento · {N} min restantes nesta sessão", atualizada a cada 5 min corridos +
  atualização final "1 min restante nesta sessão". Some quando a sessão termina. Toque abre a Home.
  Usa o canal já concedido pelo notifee; sem dado pessoal.
- Termina **sem oferta de tolerância** (removida) e o cooldown começa.

### Cooldown
- `cooldownMin` (45 min) em tempo corrido, timestamp absoluto (sobrevive a fechar o app e reiniciar).
- Tela: eyebrow "PAUSA ENTRE SESSÕES", contagem em Zilla grande ("32 min", arredondado para cima;
  < 1 min, "{s} s"), "até a próxima sessão de {duracaoBlocoMin} min", barra Musgo com o tempo já
  passado, atualizada por segundo. Nenhuma notificação no cooldown (o tempo aparece na Home, seção 2).
- Terminado, a próxima tentativa mostra a pausa de intenção com a posição avançada.

### Saldo diário
- `blocosDiarios` padrão "sem limite": sempre há próxima sessão depois do cooldown.
- Só com número (via Firestore) o saldo zera → `SALDO_ZERADO` (nunca via acesso rápido/emergência).
  Tela: eyebrow "SESSÕES DE HOJE ENCERRADAS", "Por hoje, as sessões acabaram.", "Amanhã elas voltam.
  Enquanto isso, dá pra:" + válvulas Tarefas extras ("Concluir uma devolve uma sessão") e Sessão de
  foco. Sem contagem nem pausa. Uma tarefa extra concluída volta a `AGUARDANDO_LIBERACAO`.

### Válvulas de escape ("OUTRAS SAÍDAS")
- **Acesso rápido:** libera 2 min (globais, só em primeiro plano) após 5s de espera (30s na janela
  noturna), sem pausa de intenção. Cota 3/dia (`ACESSOS_RAPIDOS_DIARIOS`, zera à meia-noite);
  intervalo mínimo contado do fim do anterior: 15 min após o 1º, 30 após o 2º, 60 após o 3º.
  Disponível também durante o cooldown, sem alterá-lo.
  - Tela própria (`EsperaAcessoRapidoScreen`): eyebrow "ACESSO RÁPIDO", headline "Liberando 2
    minutos", contagem grande; ao zerar o app abre. "Sair" cancela sem gastar a cota. Fora da
    janela noturna, pode mostrar a alternativa do dia (ver seção "Alternativa do dia" acima),
    cancelando a espera sem gastar a cota.
- **Saída de emergência:** só quando não há sessão, cooldown liberável nem acesso rápido disponível.
  Respiração guiada de 60s sem pular: eyebrow "SAÍDA DE EMERGÊNCIA", círculo Musgo que cresce 5s
  ("Inspire") e diminui 5s ("Solte o ar"), contagem em Space Mono, "Acompanhe o círculo. No fim, o
  {app} fica liberado por 2 minutos.", rodapé "Esta pausa não tem como pular.". Voltar físico
  cancela sem liberar. Com "reduzir movimento", o círculo fica parado. Sem limite de usos, não
  consome a cota do acesso rápido.
- **Sessão de foco** ("5 minutos, sem tarefa", meta "5 MIN") e **Tarefas extras** (meta = pendentes,
  omitida se zero) completam a lista. A sessão de foco não libera app ao terminar.
- **Ordem** (`montarValvulas`, `domain/valvulas.ts`, puro):
  - acesso rápido disponível: Acesso rápido ("2 minutos, depois de 5s", meta "{restantes} DE 3
    HOJE") → Sessão de foco → Tarefas extras;
  - indisponível por intervalo: Saída de emergência ("Respirar 60s e liberar 2 min", meta "SEM
    LIMITE") → Acesso rápido esmaecido → Sessão de foco → Tarefas extras;
  - cota esgotada: acesso rápido esmaecido com "Volta amanhã", meta "AMANHÃ".
- `resumoBloqueio` do dia grava `sessoesUsadas`, `intencoes` (texto livre — dado pessoal),
  `acessosRapidos`, `emergencias`.

---

## 8. Rotina estimada e janela noturna (HU-06, HU-10, HU-11)

### Estimativa (funções puras, `domain/rotina.ts`)
- Dia válido: `dailyLog` dos últimos 14 dias (sem hoje) com `usoApps.primeiroUsoDia` **e**
  `usoApps.ultimoUsoAntesPausaLonga`. Estimativa só com **≥ 5 dias válidos**. Sem pergunta no
  onboarding.
- Usa os até 7 dias válidos mais recentes: `acordarEstimado` = mediana de `primeiroUsoDia`;
  `dormirEstimado` = mediana de `ultimoUsoAntesPausaLonga`, com 00:00–05:59 somando 24h (para
  23:50 e 00:20 ficarem próximos). Arredonda para o múltiplo de 15 min mais próximo, grava `HH:mm`.
- **Janela noturna** = `dormirEstimado − 30 min` até `acordarEstimado` (pode atravessar a meia-noite).
  Só vale com `rotina.confirmadoEm` preenchido.

### Confirmação (`RotinaConfirmacaoScreen`, rota condicional do `HojeStack`)
- Aparece ao abrir o app com acesso de uso, estimativa existente e `confirmadoEm` vazio. Se
  `RecoveryStateScreen` ou `ReturnAfterPauseScreen` também tiverem de aparecer, elas vêm antes e a
  confirmação fica para a próxima abertura.
- Conteúdo: ícone de lua, eyebrow "PADRÃO IDENTIFICADO", "Parece que você costuma dormir por volta
  das {dormir}.", "Olhamos só os horários em que o celular foi usado nos últimos dias. Nada do que
  você viu ou digitou.", Dormir/Acordar, "Entre {início da janela} e {acordar}, abrir as redes vai
  pedir uma pausa um pouco maior.". Botões "Confirmar" / "Ajustar horário".
- Confirmar grava `dormirEstimado`, `acordarEstimado`, `confirmadoEm` (hoje), `modoManual: false`
  (ou `true` se ajustado), mantendo `alternativaNoturna`; segue para a `AlternativaNoturnaScreen`.
- Ajustar (mesma tela): eyebrow "AJUSTAR HORÁRIO", "Quando você costuma dormir e acordar?",
  seletores, janela recalculada ao vivo; "Confirmar" e link "Usar o horário estimado".
- Dormir = acordar: "Confirmar" desabilitado + "Os horários de dormir e acordar precisam ser diferentes.".
- Voltar físico não grava; a tela só reaparece no dia seguinte (AsyncStorage `rotina_confirmacao_adiada`).

### Alternativa noturna (`AlternativaNoturnaScreen`)
- Uma única vez, logo após confirmar. Se o app fechar no meio, não volta (editável no Perfil).
- Ícone de livro, "O que você gostaria de fazer à noite?", "Se bater a vontade de rolar a tela perto
  da hora de dormir, a gente lembra disso.", campo de até 40 caracteres, chips "Ler um pouco",
  "Preparar o dia de amanhã", "Alongar", "Escrever 3 linhas" (só preenchem). "Salvar" (desabilitado
  vazio) grava `rotina.alternativaNoturna` sem espaços nas pontas; "Agora não"/voltar não gravam.
  Ambos levam à Home.

### `RotinaPerfilScreen` (Perfil → "Rotina noturna", rota única)
- Com rotina: título "Rotina noturna" com selo "AUTOMÁTICO" / "AJUSTADO À MÃO" (`modoManual`),
  horários editáveis, "Pausa maior entre {início da janela} e {acordar}, todos os dias.", campo
  "No lugar da tela, à noite" (regras da alternativa) e "Salvar" único. Alterar horário grava
  `modoManual: true`; salvar só a alternativa não mexe em `modoManual`.
- Sem rotina: estado de `resumoRotina` ("Precisa medir o tempo nas redes" + link "Medir tempo nas
  redes", ou "Aprendendo seu horário · {n} de 5 dias"); pode definir horários à mão (grava
  `confirmadoEm` hoje e `modoManual: true`).
- "Recalcular automaticamente" (só com `modoManual`): grava `modoManual: false` e mostra "Na próxima
  abertura, o horário volta a ser estimado.". Na abertura seguinte, se houver estimativa, ela
  substitui os horários **uma vez**, mantendo `confirmadoEm`. Fora desse caso, a estimativa nunca
  altera uma rotina confirmada.
- Toda gravação de `rotina` atualiza o espelho em SharedPreferences (mesmo módulo de
  `regrasBloqueio`; só com `confirmadoEm`).

### Efeito na interceptação (decidido e aplicado só no JS)
- Dentro da janela, ao começar uma pausa de intenção: espera dobrada (teto 120s), eyebrow "JANELA
  NOTURNA · {n}ª SESSÃO", headline = frase do banco `noturno` (Zilla itálico), placeholder "O que
  você vai fazer agora? (opcional)".
- Frases `noturno` vivem no código (`src/domain/mensagensNoturnas.ts`), em ordem sequencial sem
  repetir a anterior para a mesma pessoa (índice guardado no root `Intercept`). Nunca na Home.
- Com `alternativaNoturna`: `SecondaryButton` com ícone de livro "{alternativaNoturna} em vez
  disso", acima do principal; fecha a interceptação para a tela inicial do Android sem liberar e
  sem avançar a posição.
- Dentro da janela, só a alternativa noturna vale — a alternativa do dia (seção 7) nunca aparece,
  mesmo com tarefa pendente. Sem `alternativaNoturna` cadastrada, nenhum botão aparece.
- Acesso rápido na janela: espera 30s, headline noturna e botão da alternativa. Cota e intervalos
  não mudam.
- Sessão ou acesso rápido já em andamento quando a janela começa **segue até o fim**, sem aviso.
- Decisão: o nativo (`SaldoBloqueioMaquina.kt`/`BloqueioPrefs.kt`) **não** consulta a janela —
  nenhum ponto de decisão nativo depende dela; tudo é apresentação em `usePausaNoturna` /
  `useBloqueioSaldo`. O espelho de `rotina` só é gravado.

### Privacidade
- Horários de rotina só aparecem nessas 3 telas e nos resumos de Perfil/Bloqueio. Nunca em
  notificação, toast, Progresso ou Analytics. Comunicados como padrão da pessoa, nunca como regra;
  sem a palavra "proteção".

---

## 9. TravadoFlow e sessão de foco

### TravadoFlow — "O que está pegando agora?"
- Independente da interceptação. Duas entradas, mesmo componente: botão discreto abaixo da lista
  na Home e toque longo numa tarefa (com ela pré-selecionada). Não existe entrada pela interceptação.
- Passo 1 — chips de toque único, sem texto livre; passo 2 — resposta:

| Chip | Estado | Texto | Ação |
|---|---|---|---|
| Não sei por onde começar | `confusao` | "Qual é o primeiro passo físico? Algo que dá para fazer em 2 minutos." (placeholder *abrir o arquivo, separar o material*) | Cria subtarefa (`tarefaPaiId`) → **Fazer agora** (2 min) |
| Tenho medo de ficar ruim | `medo` | "Faça a versão feia primeiro. Ninguém vai ver o rascunho." | **Começar rascunho** (5 min) |
| Está chato demais | `tedio` | "Não precisa gostar. São 5 minutos, e você pode parar depois." | **Começar** (5 min) |
| Estou sem energia | `energia` | "Energia baixa também é informação. Escolha o que cabe hoje." | **Fazer uma versão menor** (edita título) · **Descansar 10 minutos longe do celular** (timer) · **Passar para amanhã** (move a tarefa e pede `quando`) |

- "Passar para amanhã" nunca mostra culpa; se era a única essencial, o dia segue a regra normal da
  seção 1.

### Sessão de foco (`SessaoFocoScreen`)
- Durante: "Só [N] minutos. Pode parar depois." Sair para um app bloqueado reabre a interceptação
  com o timer em andamento.
- Ao terminar: "[N] minutos feitos. O começo era a parte difícil." Ações: **Continuar mais 10
  minutos** (primária) · Marcar a tarefa como feita (se houver `tarefaId` → "Feito. Isso conta.")
  · Parar aqui (volta à Home/cooldown, sem cobrança).
- Sessões de foco (2/5/10 min, qualquer origem) **nunca alteram `streakAtual`** e **não liberam
  nenhum app**.

---

## 10. Perfil (HU-09)

- Ordem: "Seu porquê" → navegação (Bloqueio de apps, Rotina noturna, Lembrete diário) → Sobre (Ver
  tutorial novamente, Política de Privacidade, Termos de Uso) → "Sair" → "Excluir conta" → link de
  debug (condicional).
- **Seu porquê:** citação (Zilla itálico, barra Musgo) com link "Editar"; sem porquê, campo vazio direto.
- **Bloqueio de apps:** cadeado + estado: ativo com regras → "Ativo · {resumoCurtoBloqueio vigente}";
  desativado com regras → "Desativado"; sem regras → "Não configurado".
- **Rotina noturna:** lua + `resumoRotina` forma curta → `RotinaPerfilScreen`.
- **Lembrete diário:** sino, horário como subtítulo, toggle; tocar no texto abre o seletor de hora.
- "Sair" é `SecondaryButton`; "Excluir conta" é link de texto neutro (Terra Suave, sublinhado) que
  abre o `ConfirmDeleteAccountModal`. Nenhum dos dois usa vermelho.

---

## 11. Notificações

- Locais (`@notifee/react-native`), não FCM: lembrete diário e alerta de risco de streak dependem de
  horário/estado local. FCM reservado para reengajamento via Cloud Function (não implementado).
- Notificações de sessão ativa: seção 7. Lembretes de serviço desligado: seção 6.

---

## 12. Privacidade e Analytics

- `intencoes` (pausa de intenção) e `estadoTravado` são dado pessoal: ficam só no documento do
  próprio usuário, nunca no Analytics com identificador, logs ou notificações.
- Nenhum evento leva intenção digitada, texto da alternativa noturna, título da tarefa do dia,
  horário de rotina, nome de app ou número de uso.
- Eventos: `intercept_shown` (`estado_tela`: fixo `'B'` — mesmo valor sem distinção real já usado
  por `registrarAcao` neste fluxo; `janela_noturna`; `alternativa`: `tarefa_essencial` |
  `tarefa_comum` | `noturna` | `nenhuma`), disparado na pausa de intenção e na espera do acesso
  rápido, nunca no cooldown ou saldo zerado; `sessao_liberada` (`posicao_no_dia`,
  `janela_noturna`), `acesso_rapido_usado`
  (`numero_do_dia`, `janela_noturna`), `emergencia_usada`, `valvula_escolhida` (`tipo`:
  `acesso_rapido` | `emergencia` | `sessao_foco` | `tarefas_extras`, `janela_noturna`),
  `alternativa_escolhida` (`tipo`: `tarefa_essencial` | `tarefa_comum` | `noturna`, `tela`:
  `pausa` | `acesso_rapido`), `travado_opened` (`origem`: `home` | `task_card`),
  `travado_state` (`estado`, sem userId), `focus_session_end` (`duracao_planejada`, `resultado`),
  `rotina_confirmada` (`ajustado`), `alternativa_noturna_respondida` (`acao`: `salvou` |
  `agora_nao`), `rotina_recalculo_pedido`, `reflexao_semanal_exibida`, `reflexao_semanal_fechada`
  (`acao`: `entendi` | `agora_nao`), `onboarding_passo_concluido` (`passo`), `onboarding_concluido`
  (`criouPrimeiraTarefa`), `ativacao_bloqueio_convite` (`acao`: `configurar` | `agora_nao`) — ver
  seção 13 pros detalhes.
- Qualquer campo novo gravado em `users/{uid}`, SDK novo que colete dados ou mudança no que o
  Accessibility Service lê exige atualizar `docs/legal/` (ver `spec.md`, Restrições).

---

## 13. Onboarding e ativação do bloqueio

### Primeira tarefa (passo final do onboarding)

- Com `focoProcrastinacao === 'redes_sociais'`: título "O que você vai fazer no lugar da
  rolagem hoje?" (mesma linguagem da HU-07, seção 2), placeholder "O que você faria em vez
  de abrir o feed?", chips "Ler 10 páginas", "Caminhar 15 min", "Alongar 5 min", "Arrumar a
  mesa" (toque preenche o título, mesmo comportamento do `AddTaskForm`).
- Qualquer outro foco (`estudos`, `trabalho`, `organizacao_pessoal`, `outro`, ou sem resposta):
  título "Vamos começar pequeno de propósito.", placeholder "ex: separar a roupa de treino",
  sem chips.
- "Começar" cria a tarefa de hoje e conclui o onboarding; "Pular por hoje" conclui sem criar
  tarefa nenhuma — os dois sempre avançam, nunca ficam bloqueados por validação.

### Convite de ativação do bloqueio (`AtivacaoConviteScreen`)

- Aparece uma única vez, logo depois do onboarding ser concluído — inclusive para quem já
  tinha `onboardingConcluido` antes desta mudança (gate é a flag local
  `ativacao_bloqueio_mostrada`, independente da data de conclusão do onboarding).
- Título "Agora, o bloqueio das redes", texto "Pra pausar antes de abrir as redes que mais
  tiram seu foco, o Rootora precisa que você escolha os apps e ative a permissão de
  acessibilidade.". Botões "Configurar bloqueio" (abre a tela de escolha de apps/Accessibility,
  mesmas telas já usadas no Perfil) e "Agora não" (pula sem fricção).
- As duas escolhas gravam a flag e nunca mais mostram essa tela de novo; "Agora não" não bloqueia
  nada do resto do app.
- Não substitui nem muda as telas de divulgação do Play Store
  (`DivulgacaoAcessibilidadeScreen`/`DivulgacaoAcessoUsoScreen`) — só é um ponto de entrada
  novo pra elas.

### Analytics do onboarding e da ativação

- `onboarding_passo_concluido` (`passo`: índice 0-2, só nos 3 primeiros passos — foco, tempo de
  tela, porquê). `onboarding_concluido` (`criouPrimeiraTarefa`: diferencia "Começar" de "Pular
  por hoje"). `ativacao_bloqueio_convite` (`acao`: `configurar` | `agora_nao`). Nenhum dos três
  leva texto digitado (foco, porquê ou título da tarefa).

---

## 14. Pendências e decisões em aberto

**Não implementar sem decidir o escopo com o Lucas antes:**
- XP e níveis (risco de métrica vazia)
- Micro-reflexão pós-recaída
- Conteúdo bíblico como toggle opcional (banco em `banco-de-versiculos.md`)
- Seleção de tema visual (Amanhecer/Raiz/Maré) — hoje tema único Raiz
- Onde/se voltar a mostrar a contagem de proteções (saiu da Home na HU-07)
- Proposta de redução de tempo nas redes como desafio (exige novo tipo de desafio)
- Linha de apoio após "sem energia" recorrente (5 de 7 dias → "Precisa de mais apoio?" no Perfil,
  CVV 188). Texto proposto: "Você tem marcado energia baixa com frequência. Se isso estiver pesando,
  conversar com alguém pode ajudar." **Exige revisão de psicólogo antes de publicar.**

**Planejado, não iniciado:** tela de edição de `duracaoBlocoMin`/`cooldownMin`/`blocosDiarios`;
desbloqueio por calorias (Health Connect); widget de tela inicial; reengajamento por FCM;
assinatura (ver `spec.md`, Loja e publicação).

**Implementado, não validado em aparelho físico:** contagem da sessão em primeiro plano/tela
apagada; promoção de pendência com o app fechado; `InterceptScreen` (meta < 300 ms); notificação
de sessão ativa (`RootoraAccessibilityService`); `BloqueioPrefs.salvarRotina` (Kotlin).
