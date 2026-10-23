# Interceptação de bloqueio: sessões, válvulas de escape e rotina noturna

> Extensão da funcionalidade de bloqueio de apps (`regras-de-negocio.md`, seção 4).
> Base teórica: Fundamentação Teórica, seções 2.2 (reparo de humor), 3 (ciclo), 7 (perfeccionismo), 10.2 (se-então) e 10.3 (fatiamento).
> Status: **validado e implementado** — único caminho de bloqueio/interceptação em
> produção. Decisões da seção 9 fechadas.
>
> **Histórico:** o desenho original (out/2025) liberava o app só depois de cumprir a
> tarefa essencial do dia (estados A/B/C + saldo de blocos ganho por tarefa). Em uso
> real isso levou a desativar o Accessibility Service para acessar algo sem
> alternativa dentro do app — ver `regras-de-negocio.md` seção 5 para o detalhe do
> problema. Este documento descreve o motor atual: sessões de uso disponíveis desde o
> início do dia, com pausa entre elas, mais duas válvulas de escape (acesso rápido e
> emergência) e fricção adicional dentro da janela noturna.

---

## 1. Problema que resolve

O app atuava antes da procrastinação (planejamento) e depois dela (streak, escudo,
recaída), mas não durante o momento da fuga — quando a pessoa sente o desconforto da
tarefa e abre um app de distração. A interceptação transforma o bloqueio de portão em
ponte: em vez de depender de cumprir uma tarefa pra abrir o app, o motor passa a
controlar o próprio acesso — quanto tempo, com que frequência e com que fricção —
sempre deixando uma saída mais barata do que desativar o serviço de acessibilidade.

Diferencial: nenhum concorrente conhecido conecta o app de fuga à tarefa específica
que está sendo evitada (via TravadoFlow) nem adapta a fricção ao horário de dormir da
própria pessoa (rotina estimada).

---

## 2. Fluxo geral

```
Accessibility detecta app bloqueado, dentro da janela de horário configurada
        │
        ▼
Existe sessão ativa? ──sim──► continua usando (contador global, só em primeiro plano)
        │ não
        ▼
Está em cooldown? ──sim──► EsperaBloqueioScreen (cooldown + válvulas)
        │                       ├─► Acesso rápido (2 min, cota 3/dia) — se disponível
        │ não                   ├─► Emergência (respiração 60s) — se acesso rápido indisponível
        ▼                       └─► atalhos de sempre: sessão de foco (5 min, sem tarefa) / tarefas extras
PausaIntencaoScreen (10/20/30/40/50/60s, dobrado na janela noturna)
        │
        ├─► "Liberar" (após a espera) ──► Sessão ativa de 15 min
        └─► Sair (volta à tela inicial do Android)

Home ─► botão "Estou travado" (abaixo da lista) ─► TravadoFlow
TaskCard ─► toque longo ─► TravadoFlow (com a tarefa pré-selecionada)
```

O TravadoFlow e a interceptação são dois caminhos independentes desde a HU-04: a
interceptação não oferece mais "Fazer 2 minutos"/"Estou travado" como estados A/C —
ela só decide pausa de intenção, sessão, cooldown e válvulas (mais o atalho neutro de
sessão de foco sem tarefa, que já existia na tela de cooldown antes da HU-04). O
"Estou travado" (TravadoFlow completo, com chips) fica só na Home e no toque longo da
tarefa (ver seção 6).

---

## 3. InterceptScreen — pausa de intenção, sessão, cooldown

### Máquina de estados

```
AGUARDANDO_LIBERACAO ⇄ PAUSA_INTENCAO → SESSAO_ATIVA → COOLDOWN → (AGUARDANDO_LIBERACAO | SALDO_ZERADO)
SALDO_ZERADO → AGUARDANDO_LIBERACAO (tarefa extra concluída)
qualquer estado → reinicia em AGUARDANDO_LIBERACAO na virada do dia
```

`SALDO_ZERADO` só é alcançável se `blocosDiarios` estiver configurado como número
(padrão é "sem limite" — ver `regras-de-negocio.md` seção 5). `PAUSA_INTENCAO` é só de
tela (reinicia ao sair), por isso não é persistida; os demais estados vivem em
`SaldoBloqueioMaquina.kt` (nativo, autoridade) com cópia de referência em
`domain/saldoBloqueio.ts`.

### Estados de tela

| Estado | Tela | Texto / comportamento |
|---|---|---|
| `AGUARDANDO_LIBERACAO` → abrir app bloqueado | PausaIntencaoScreen | Campo opcional "O que você vai fazer agora?" + botão "Liberar" desabilitado pela sequência de espera (seção abaixo). Sair da tela reinicia a pausa |
| `SESSAO_ATIVA` | — (app liberado) | Aviso não bloqueante "1 minuto restante" a 1 min do fim. Sem oferta de tolerância ao terminar |
| `COOLDOWN` | EsperaBloqueioScreen | Contagem regressiva "próximo acesso em X min" + válvulas de escape (seção 4) + atalhos de sempre (sessão de foco de 5 min sem tarefa / tarefas extras) |
| `SALDO_ZERADO` | EsperaBloqueioScreen (variante) | Mesmos atalhos do cooldown, sem a pausa de intenção nem contagem — só aparece com `blocosDiarios` configurado e saldo do dia esgotado |

### Pausa de intenção

Sequência de espera em segundos, pela posição da sessão já liberada no dia (1ª, 2ª,
3ª...), fixa no código (`SEQUENCIA_PAUSA_INTENCAO_SEG_V2`):

| Posição da sessão | 1ª | 2ª | 3ª | 4ª | 5ª | 6ª em diante |
|---|---|---|---|---|---|---|
| Espera (fora da janela noturna) | 10s | 20s | 30s | 40s | 50s | 60s (teto) |
| Espera (dentro da janela noturna, seção 5) | 20s | 40s | 60s | 80s | 100s | 120s (teto) |

### Sessão de uso

Dura 15 minutos (`duracaoBlocoMin`), contados globalmente (soma de todos os apps
bloqueados) e só avançam com um app bloqueado em **primeiro plano** — sair do app ou
apagar a tela pausa o contador; teclado e barra de notificações não contam como saída.
Sem tolerância ao terminar (removida; não substituída).

### Cooldown

45 minutos corridos (`cooldownMin`), timestamp absoluto — sobrevive a fechar o app e
reiniciar o aparelho. Terminado o cooldown, a próxima tentativa de abrir um app
bloqueado mostra a pausa de intenção de novo, com a sequência avançando uma posição.

### Saldo diário

`blocosDiarios` tem padrão "sem limite": terminado um cooldown, sempre há uma próxima
sessão disponível, sem bloqueio até o dia seguinte. Só quando configurado como número
(ainda sem tela de edição, só via Firestore) o saldo pode chegar a zero e levar a
`SALDO_ZERADO` — que nunca é atingido via acesso rápido ou emergência, só via sessões
normais. Uma tarefa extra concluída com saldo zerado tira a interceptação desse estado,
voltando a `AGUARDANDO_LIBERACAO`.

---

## 4. Acesso rápido e saída de emergência

Duas válvulas de escape, sempre mais baratas do que desativar o Accessibility Service
— existem porque um cooldown sem nenhuma saída intermediária recria esse motivo.

### Acesso rápido

- Libera **2 minutos** de uso (contados globalmente, só em primeiro plano, igual à
  sessão), depois de uma espera de **5 segundos** (sem campo de texto, sem pausa de
  intenção).
- Cota de **3 usos por dia** (`ACESSOS_RAPIDOS_DIARIOS`, fixo no código), zera à meia-
  noite junto com o resto do saldo.
- Intervalo mínimo entre usos, contado a partir do fim do acesso rápido anterior: **15
  min** depois do 1º uso do dia, **30 min** depois do 2º, **60 min** depois do 3º (não
  há 4º uso — a cota já acabou).
- Disponível também durante o **cooldown de uma sessão normal**, sem encurtar nem
  cancelar esse cooldown.
- Com cota disponível e intervalo já passado, a tela mostra o botão "Acesso rápido (2
  min)"; caso contrário, mostra "próximo acesso rápido em X min" em vez do botão —
  nunca como uma negativa, só como tempo de espera.

### Saída de emergência

- Aparece **só** quando não há sessão ativa, nem cooldown liberável, nem acesso
  rápido disponível no momento (cota ou intervalo impedindo) — nunca substitui uma
  opção melhor já disponível.
- Respiração guiada de **60 segundos, sem opção de pular**. Ao terminar, libera 2
  minutos de uso, contados como o acesso rápido.
- **Sem limite de usos por dia** e **não consome a cota do acesso rápido**. Cada uso é
  registrado (`emergencias`).

---

## 5. Rotina estimada e janela noturna

### De onde vem a estimativa

A coleta de uso (HU-02, seção abaixo e `schema-firebase.md` seção 3) grava, além de
`segundos`/`aberturas` por app, dois horários por dia em `dailyLogs/{data}.usoApps`:
`primeiroUsoDia` (primeiro uso do dia, proxy de "acordar") e
`ultimoUsoAntesPausaLonga` (último uso antes de um intervalo de 3h+ sem nenhum evento,
proxy de "dormir"). Com pelo menos **5 dias** desses dois campos no histórico (dias
anteriores à atualização do app, sem os campos, não contam), o app calcula uma
estimativa de horário de dormir e acordar — sem nenhuma pergunta no onboarding.

### Confirmação (uma vez)

Calculada a estimativa, e sem `rotina.confirmadoEm` preenchido, a próxima abertura do
app mostra a tela de confirmação com o horário estimado de dormir. "Confirmar" grava
`rotina.dormirEstimado`, `rotina.acordarEstimado` e `rotina.confirmadoEm`. "Ajustar
horário" permite editar os dois valores antes de confirmar. Sem confirmação, a janela
noturna não é aplicada em nenhuma interceptação — tudo segue como nas seções 3 e 4.

Na sequência (uma única vez), uma tela pergunta por uma **alternativa noturna**
opcional ("O que você gostaria de fazer à noite?"). Responder grava
`rotina.alternativaNoturna` (texto livre); "Agora não" não grava nada e não repete a
pergunta — continua editável depois pelo Perfil (seção "Rotina").

### Janela noturna

Vai de **30 minutos antes** de `rotina.dormirEstimado` até `rotina.acordarEstimado`,
recalculada a cada dia a partir desses dois horários (a estimativa em si só muda por
reconfirmação manual no Perfil). Dentro da janela, ao abrir um app bloqueado sem
sessão nem cooldown ativos:

- A pausa de intenção usa o **dobro** da espera normal da posição atual (teto de 120s
  — tabela da seção 3).
- O texto padrão ("O que você vai fazer agora?") é substituído por uma **mensagem do
  banco `noturno`** (`banco-de-frases.md`), em rotação sequencial sem repetir a mesma
  mensagem duas vezes seguidas para a mesma pessoa.
- Com `rotina.alternativaNoturna` preenchida, aparece um botão secundário adicional
  com o texto da alternativa (ex.: "Ler um pouco em vez disso"), que fecha a
  interceptação sem liberar a sessão. Sem alternativa cadastrada, o botão não aparece.
- O **acesso rápido** (seção 4) também é afetado: espera de **30 segundos** em vez de
  5, com a mesma mensagem noturna e o mesmo botão de alternativa no lugar do texto
  padrão. A cota e os intervalos do acesso rápido não mudam — só a espera e o texto.
  Isso vale mesmo quando o acesso rápido aparece durante o cooldown de uma sessão.

Fora da janela noturna, mesmo com `rotina.confirmadoEm` preenchido, tudo segue
exatamente como nas seções 3 e 4 (sequência normal, texto padrão).

### Editar manualmente

Editar `rotina.dormirEstimado` ou `rotina.acordarEstimado` no Perfil marca
`rotina.modoManual` como verdadeiro — a partir daí a estimativa automática não roda
mais; os horários só mudam por nova edição manual, até a opção "Recalcular
automaticamente" no Perfil, que limpa `rotina.modoManual` (HU-10, RN15). Essa opção não
troca os horários na hora: a estimativa atual (se já houver uma) substitui
`dormirEstimado`/`acordarEstimado` uma única vez, na abertura seguinte do app, mantendo
`confirmadoEm` — não é uma reestimativa contínua a cada dia. Fora desse momento logo
após "Recalcular automaticamente", a estimativa automática nunca altera uma rotina já
confirmada (resolve a ambiguidade com "a estimativa em si só muda por reconfirmação
manual", acima).

### Privacidade

A estimativa de rotina nunca é exibida ou comunicada fora da tela de confirmação e do
Perfil — nenhuma notificação cita o horário estimado. Nenhum texto desta seção usa a
palavra "proteção" (reservada ao streak) nem soa como regra imposta: a janela noturna
é comunicada como um padrão identificado.

### Extensão da coleta de uso (HU-02)

A estimativa só existe porque a coleta de uso, que já gravava tempo e aberturas por
app via `UsageStatsManager` (sem depender do Accessibility Service — ver
`schema-firebase.md` seção 3), passou a gravar também os dois horários acima. Ambos em
ISO 8601 horário local, uma vez por dia (não por app), calculados por
`agregarUsoPorDia` a partir dos eventos de uso do dia. Gravar `usoApps` num dia nunca
altera `tarefas`, `statusDia`, `escudoUsado` nem o streak — um `dailyLog` que passa a
existir só por causa de `usoApps` é equivalente, pro Progresso, a esse documento não
existir.

---

## 6. TravadoFlow — "O que está pegando agora?"

Caminho independente da interceptação (seção 2): acessível só pela Home e pelo toque
longo na tarefa (o antigo terceiro caminho, pelo estado A da InterceptScreen, não
existe mais desde a HU-04). Não confundir com o atalho neutro "sessão de foco de 5 min
sem tarefa" oferecido na tela de cooldown/saldo zerado (seção 3) — esse não passa pelos
chips abaixo.

### Passo 1 — chips de toque único, sem texto livre

| Chip | Estado | Base teórica |
|---|---|---|
| Não sei por onde começar | `confusao` | Tarefa vaga/sem estrutura (Sirois & Pychyl) |
| Tenho medo de ficar ruim | `medo` | Preocupações perfeccionistas (Sirois et al., 2017) |
| Está chato demais | `tedio` | Aversividade da tarefa (Steel, 2007) |
| Estou sem energia | `energia` | Recurso real, não falha de caráter |

### Passo 2 — resposta por estado

| Estado | Texto | Ação |
|---|---|---|
| `confusao` | "Qual é o primeiro passo físico? Algo que dá para fazer em 2 minutos." Placeholder: *abrir o arquivo, separar o material* | Cria subtarefa (`tarefaPaiId`) → **Fazer agora** (timer 2 min) |
| `medo` | "Faça a versão feia primeiro. Ninguém vai ver o rascunho." | **Começar rascunho** (timer 5 min) |
| `tedio` | "Não precisa gostar. São 5 minutos, e você pode parar depois." | **Começar** (timer 5 min) |
| `energia` | "Energia baixa também é informação. Escolha o que cabe hoje." | **Fazer uma versão menor** (edita título da tarefa) · **Descansar 10 minutos longe do celular** (timer) · **Passar para amanhã** (move a tarefa e pede `quando`) |

"Passar para amanhã" não exibe nenhum texto de culpa. Se era a única essencial, o dia
segue a regra normal de escudo/queda parcial.

---

## 7. SessaoFocoScreen e FimSessao

**Durante o timer:** "Só [N] minutos. Pode parar depois."
Se o usuário sair para um app bloqueado durante o timer, a interceptação reaparece
mostrando o timer em andamento.

**Ao terminar:** "[N] minutos feitos. O começo era a parte difícil."

| Ação | Efeito | Visibilidade |
|---|---|---|
| **Continuar mais 10 minutos** (primária) | Novo timer de 10 min | Sempre |
| Marcar a tarefa como feita | Conclui a tarefa → overlay "Feito. Isso conta." | Sempre que houver `tarefaId` |
| Parar aqui | Registra a sessão, volta à Home/à tela de cooldown, sem texto de cobrança | Sempre |

> **Removido (HU-04):** o botão "Liberar o [App] por 15 minutos" (visível só com
> `origem = 'interceptacao'` e vindo do antigo estado A "Fazer 2 minutos") deixou de
> existir junto com os estados A/C da InterceptScreen. A sessão de foco não libera
> mais app nenhum ao terminar, venha ela do TravadoFlow (`origem: 'travado'`/`'home'`)
> ou do atalho neutro de 5 min sem tarefa oferecido no cooldown (`origem:
> 'interceptacao'`, seção 3) — quem quiser acesso ao app passa pela pausa de intenção
> (seção 3) ou pelas válvulas (seção 4), nunca pelo fim de uma sessão de foco.

### Regra de streak

Sessões de foco **não contam para o streak**. Só a conclusão de tarefa essencial conta
(regra 1.1 inalterada, `regras-de-negocio.md` seção 1). Evita que o timer vire atalho e
esvazie o significado do streak.

---

## 8. Regra de alteração do bloqueio (pré-compromisso) — regra única

O "custo crescente de desbloqueio" (antigo sistema `bloqueioApps`/`AppBlockedScreen`,
removido) é **substituído** pela regra de pré-compromisso: **uma regra só, sem
distinguir se a mudança afrouxa ou endurece.**

- O usuário define apps bloqueados (seção 9) e uma janela de horário (início/fim +
  dias da semana) na tela "Bloqueio de apps" (Perfil).
- A **primeira configuração** (quando `regrasBloqueio` ainda não existe) vale
  imediatamente.
- **Qualquer alteração depois disso** — inclusive desativar o bloqueio por completo —
  só entra em vigor no dia seguinte. Não importa se a mudança deixa o bloqueio mais
  solto ou mais apertado.
- Uma nova alteração enquanto já existe uma pendente **substitui** a pendente (não
  acumula).
- Texto ao salvar quando vira pendente: "Anotado. A nova regra começa amanhã." A tela
  mostra "Nova regra começa amanhã: [resumo]" com a opção "Cancelar alteração" (apaga
  a pendência na hora, sem esperar o dia seguinte).
- A promoção pendente→vigente acontece no lado nativo (Kotlin), não no JS — o
  `AccessibilityService` promove sozinho quando a data vence, mesmo com o app fechado;
  na próxima abertura do app, o lado RN sincroniza esse novo estado de volta no
  Firestore.

> **Exceção pontual (HU-04):** os novos padrões de sessão (15 min), cooldown (45 min)
> e pausa de intenção passaram a valer imediatamente para todo usuário, sem criar
> `regrasBloqueioPendentes` — foi uma migração de uma vez, não uma regra permanente. Um
> `regrasBloqueioPendentes` já existente de uma alteração de apps ou janela não foi
> afetado por essa migração.

Racional: impede renegociação no pico da vontade sem mecânica punitiva (princípio 3).
Não distinguir afrouxar de endurecer simplifica a regra sem abrir brecha. Saída de
emergência sempre disponível: o usuário pode desativar o Accessibility Service nas
configurações do Android — o app não tenta impedir isso, e mostra uma divulgação em
destaque (honesta sobre o que o serviço vê e não vê) antes de abrir essa tela de
configurações pela primeira vez.

---

## 9. Schema — alterações (resumo; ver `schema-firebase.md` para o canônico)

### `users/{uid}` — campos do motor de bloqueio

```
regrasBloqueio: {
  apps: string[],              // packageNames da lista curada (HU-01), nunca fora dela
  janelas: [{inicio, fim, diasSemana[]}],
  duracaoBlocoMin?: 15,        // duração da sessão
  cooldownMin?: 45,
  blocosDiarios?: 'sem limite' // ou um número, se configurado via Firestore
}
regrasBloqueioPendentes: { ...regrasBloqueio, efetivaEm: 'YYYY-MM-DD' } | null

rotina: {
  dormirEstimado: string,      // "HH:mm"
  acordarEstimado: string,     // "HH:mm"
  confirmadoEm: string | null, // "YYYY-MM-DD"
  alternativaNoturna: string | null,
  modoManual: boolean
}
```

### `dailyLogs/{YYYY-MM-DD}` — resumo e uso

```
resumoBloqueio: {
  sessoesUsadas: number,
  intencoes: string[],      // texto livre da pausa de intenção — dado pessoal
  acessosRapidos: number,
  emergencias: number
}

usoApps: {
  [packageName]: { segundos: number, aberturas: number },
  primeiroUsoDia: string,              // ISO 8601 local
  ultimoUsoAntesPausaLonga: string     // ISO 8601 local
}
```

> **Removido (HU-04):** `toleranciasUsadas` em `resumoBloqueio` e o array
> `interceptacoes[]` (estados A/B/C não existem mais, nada substitui esse log de
> evento por evento — os contadores de `resumoBloqueio` bastam).

### `tarefas[]` — campos opcionais (sem mudança nesta rodada)
| Campo | Tipo | Uso |
|---|---|---|
| `tarefaPaiId` | string \| null | Subtarefa criada no fluxo `confusao` do TravadoFlow |
| `quando` | string (`HH:mm`) \| null | Intenção de implementação (se-então) |

### Privacidade

`intencoes` (texto livre da pausa de intenção) é dado pessoal e fica somente no
documento do próprio usuário — não é enviado ao Analytics vinculado a identificador.

---

## 10. Integração nativa (Android)

| Ponto | Decisão | Motivo |
|---|---|---|
| Abrir a interceptação | Accessibility Service inicia `InterceptActivity`, que monta root RN separado (`AppRegistry.registerComponent('Intercept', ...)`) | Abre por cima do app bloqueado sem carregar a navegação completa |
| Máquina de estados | `SaldoBloqueioMaquina.kt` (autoridade, roda sem JS) com cópia de referência em `domain/saldoBloqueio.ts`, mesmas fixtures (`domain/__fixtures__/saldoBloqueio.json`) | Sessão/cooldown precisam sobreviver a fechar o app e reiniciar o aparelho |
| Regras de bloqueio | RN espelha `regrasBloqueio` vigentes em SharedPreferences | Service consulta sem depender do JS estar rodando |
| Rotina/janela noturna | Horários de `rotina` também espelhados em SharedPreferences, consultados pela máquina de estados nativa para dobrar a pausa e trocar o texto | Decisão de fricção acontece no nativo, igual ao resto da máquina |
| Escrita de registros | Root Intercept grava no Firestore com persistência offline | Não bloqueia a UI |

---

## 11. Decisões fechadas

| # | Decisão | Escolha |
|---|---|---|
| 1 | Liberação por tarefa vs. sessões com cooldown | Sessões com cooldown (HU-04) — liberação condicionada a cumprir tarefa levava a desativar o serviço |
| 2 | Cooldown sem saída intermediária | Duas válvulas de escape: acesso rápido (limitado, espaçado) e emergência (sem limite, com fricção de respiração) — HU-05 |
| 3 | Fricção extra à noite | Rotina estimada por uso (sem pergunta no onboarding) + janela noturna com pausa dobrada e mensagem contextual — HU-06 |
| 4 | Custo crescente vs. pré-compromisso (config de apps/janela) | Pré-compromisso: qualquer alteração depois da primeira configuração só vale amanhã, regra única (seção 8) |
| 5 | Posição do "Estou travado" | Botão discreto abaixo da lista na Home + toque longo no TaskCard (não mais pela interceptação) |
| 6 | "Sem energia" recorrente | 5 de 7 dias → exibir uma vez linha gentil apontando para "Precisa de mais apoio?" no Perfil. **Texto exige revisão de psicólogo antes da publicação** |

Texto proposto para o item 6 (sujeito a revisão):
> "Você tem marcado energia baixa com frequência. Se isso estiver pesando, conversar com alguém pode ajudar."
> Link: "Precisa de mais apoio?" → Perfil (CVV 188, orientação para buscar psicólogo).

---

## 12. Métricas (Firebase Analytics)

| Evento | Parâmetros |
|---|---|
| `intercept_shown` | `estado` (`pausa_intencao` \| `cooldown` \| `saldo_zerado`), `janela_noturna` (bool) |
| `sessao_liberada` | `posicao_no_dia`, `janela_noturna` |
| `acesso_rapido_usado` | `numero_do_dia` (1/2/3), `janela_noturna` |
| `emergencia_usada` | — |
| `travado_opened` | `origem` (`home` \| `task_card`) |
| `travado_state` | `estado` (sem userId vinculado) |
| `focus_session_end` | `duracao_planejada`, `resultado` |
| `rotina_confirmada` | — |

**Métricas de validação:**
- **Taxa de uso da emergência** — quanto maior, mais sinal de que o cooldown/acesso
  rápido não estão dando saída suficiente (o oposto do esperado).
- **Taxa de conversão da fuga (TravadoFlow)** — % de aberturas do TravadoFlow que viram
  sessão de foco.
- **Taxa de embalo** — % de sessões de foco com resultado `continuou` ou
  `concluiu_tarefa`.

**Risco de métrica vazia: baixo.** Nenhuma vira pontuação exibida ao usuário; todas
medem comportamento.

---

## 13. Critérios de aceite

- [ ] Abrir um app bloqueado pela primeira vez no dia, dentro da janela, mostra a pausa de intenção com o botão desabilitado pela posição da sessão (10/20/30/40/50/60s)
- [ ] Liberar a pausa inicia uma sessão de 15 min contada só com o app em primeiro plano; a sessão termina sem tolerância e o cooldown de 45 min começa
- [ ] Sem `blocosDiarios` configurado, nunca há bloqueio até o dia seguinte — sempre há uma próxima sessão depois do cooldown
- [ ] Com `blocosDiarios` configurado e saldo zerado, a tela mostra os atalhos (sessão de foco de 5 min sem tarefa/tarefas extras), sem pausa de intenção
- [ ] Acesso rápido libera 2 min após 5s de espera, respeita a cota de 3/dia e os intervalos 15/30/60 min, e funciona durante o cooldown sem alterá-lo
- [ ] Emergência só aparece sem sessão, cooldown liberável nem acesso rápido disponíveis; libera 2 min após 60s de respiração, sem limite de usos e sem consumir a cota do acesso rápido
- [ ] Com rotina confirmada, dentro da janela noturna a pausa de intenção dobra (teto 120s) e mostra mensagem do banco `noturno`; o acesso rápido espera 30s em vez de 5 e mostra a mesma mensagem
- [ ] Sem rotina confirmada, ou fora da janela noturna, tudo segue com a sequência e o texto padrão
- [ ] TravadoFlow (chips completos) acessível só pela Home e pelo toque longo, com o mesmo componente — não existe mais entrada pela interceptação
- [ ] Sair do timer de foco para um app bloqueado reabre a interceptação com o timer ativo
- [ ] Sessões de foco não alteram `streakAtual` e não liberam nenhum app ao terminar
- [ ] Qualquer alteração de apps/janela feita depois da primeira configuração grava em `regrasBloqueioPendentes` e só vigora em `efetivaEm`
- [ ] Lista de apps da tela de configuração usa a lista curada de redes sociais (HU-01), nunca `QUERY_ALL_PACKAGES`
- [ ] Divulgação em destaque aparece antes de abrir as configurações de acessibilidade do Android, e `consentimentoAcessibilidade` só é gravado ao tocar "Concordo e quero ativar"
- [ ] Nenhum texto com ponto de exclamação, pedido de desculpas, culpa ou a palavra "proteção" fora do streak
- [ ] `estadoTravado` e `intencoes` ausentes dos eventos de Analytics com identificador
