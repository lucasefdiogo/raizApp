# Spec do Projeto — Rootora

> Consolidado de `definition/01-visao-geral-projeto.md`, `definition/00-instrucoes-do-projeto.md`,
> `definition/regras-de-negocio.md`, `definition/09-ponte-fuga-tarefa-e-estou-travado.md`,
> `definition/procedimento-loja.md` e `docs/legal/README.md`. Este arquivo é a fonte única de
> verdade para escopo, regras de negócio e restrições do produto — ver `../../CLAUDE.md` para
> como essa fonte se relaciona com `/definition` (histórico/origem do conteúdo).

## O que é

Rootora é um app mobile (Android, React Native CLI bare workflow + TypeScript + Firebase) para
ajudar pessoas presas no ciclo **celular → distração → culpa → procrastinação** a recuperarem
foco e constância — via tarefas fatiadas, streak com sistema de proteção (perdão), recaída sem
culpa e bloqueio de apps (diferencial competitivo), sem apelar para culpa, pressão ou viés
religioso.

## Problema

Procrastinação não é preguiça — é evitação emocional ativa: o cérebro percebe a tarefa como
ameaça e busca alívio imediato no celular. O alívio consome a atenção por completo (scroll sem
ponto de saída natural), o retorno à realidade gera culpa, e a culpa aumenta a aversão à tarefa
original, realimentando o ciclo. Fundamentação completa, com fontes, em
`definition/fundamentacaoteoricaprojeto.pdf`.

## Público-alvo

Pessoas que sentem que perdem tempo/atenção de forma repetida no celular e querem recuperar
controle sobre rotina, foco e produtividade pessoal — sem julgamento religioso ou moralista.

## Métrica de sucesso

**Retenção em 7 dias** — a pessoa volta a usar o app depois de uma semana. Mais honesta que
downloads para validar se a mecânica de streak sem culpa sustenta o hábito.

## Princípios inegociáveis do produto

Toda decisão de produto (mecânica, copy, gamificação) deve respeitar estes cinco princípios:

1. **Reduzir a ameaça percebida da tarefa**, nunca aumentar cobrança — tarefas fatiadas, clareza,
   tempo estimado visível
2. **Comunicação honesta sobre neurociência** — nunca prometer "resetar o cérebro" ou "esvaziar
   dopamina"; o produto é recondicionamento comportamental, não milagre neuroquímico
3. **Recaída sem vergonha** — falha é informação, não sentença. Fricção é aceitável (ex.: regra
   de pré-compromisso do bloqueio — ver abaixo), punição não
4. **Autoeficácia por acúmulo de pequenas vitórias** — desconfiar de gamificação vazia
5. **Ressignificação constante do "porquê"** — o motivo pessoal do usuário (onboarding) reaparece
   nos momentos de recaída/retorno

Se uma tarefa pedir algo que contradiga isso, apontar o conflito antes de implementar.

## Regras de texto (copy)

- Frases curtas, verbo no início
- Sem ponto de exclamação, sem tom de cobrança, sem pedido de desculpas
- Ao usuário é "proteção"; o nome interno no código e no Firestore continua "escudo"
- Evitar a palavra "streak" em texto exibido

## Decisões-chave já tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Conteúdo bíblico | Fora do produto por ora; possível toggle opcional no futuro (pendente) | Simplifica o público inicial, evita viés religioso não solicitado |
| Plataforma inicial | Android primeiro, iOS depois | Foco de recursos; iOS exige macOS/Xcode e aprovação mais rígida para bloqueio de apps |
| Stack mobile | React Native CLI (bare workflow), não Expo | Integrações nativas profundas (Accessibility Service, widget planejado) |
| Backend | Firebase (Auth, Firestore). Cloud Functions só para verificação de assinatura, no futuro | Velocidade de desenvolvimento |
| Notificações | Locais (`@notifee/react-native`), não FCM | Lembrete diário/alerta de streak dependem de horário/estado local |
| Bloqueio de apps | Accessibility Service + regra de pré-compromisso (alteração só vale amanhã) | Fricção sem punição; sistema antigo de custo crescente foi removido |
| Identidade visual | Raiz, tema único no MVP | Metáfora de fundação/consistência |
| Monetização | Assinatura do app inteiro, 7 dias grátis, verificação via Cloud Function | Ver seção "Loja e publicação" abaixo |
| Pacote Android | `com.luxthorapps.rootora` (permanente após 1ª publicação) | — |
| Pendente de decisão | XP/níveis, micro-reflexão pós-recaída, conteúdo bíblico (toggle), seleção de tema | Ver `roadmap-e-status` em `/definition` |

## Regras de Negócio

### 1. Streak e Proteção

**Dia cumprido:** pelo menos 1 tarefa essencial concluída no dia (`avaliarDiaCumprido`,
`domain/streak.ts`). Tarefas comuns, mesmo todas concluídas, não cumprem o dia — teto de 3
essenciais existe para manter o foco em poucas vitórias reais (princípio 4). Dia sem nenhuma
tarefa nunca é cumprido. Máximo de 3 tarefas essenciais por dia
(`LIMITE_TAREFAS_ESSENCIAIS`, `domain/dailyTasks.ts`); rebaixar de essencial é sempre livre.

**Sistema de Proteção:** 1 proteção disponível por semana, renovação automática toda
segunda-feira, não acumula (expira se não usada), ativação automática. Com proteção, o streak
numérico não é zerado e o dia perdido fica marcado de forma neutra no histórico.

**Sem proteção disponível:**
- 1 dia perdido: streak cai para 50% do valor anterior, arredondado para baixo, mínimo 1
  enquanto streak > 0 (`Math.max(1, Math.floor(x * 0.5))`). Streak 0 continua 0.
  `diasTotaisAtivos` não muda.
- 2+ dias seguidos perdidos: streak vai a 0 e recomeça em 1 no próximo dia cumprido. A proteção
  não é consultada nesse caso (cobre falha isolada, não sumiço de vários dias).

**Marcos de celebração:** 3 · 7 · 14 · 30 · 60 · 90 dias.

**Lógica diária** (comparando `ultimoDiaAtivo` com a data atual, ao abrir o app):
0. Primeiro dia de uso → só grava hoje como ponto de partida, não avalia nada
1. Dia cumprido → `streakAtual += 1`, `diasTotaisAtivos += 1`
2. Dia não cumprido + proteção disponível → consome a proteção, streak mantido,
   `statusDia = 'protegido_escudo'`
3. Dia não cumprido + sem proteção → `streakAtual = max(1, floor(streakAtual * 0.5))`,
   `statusDia = 'perdido'`
4. 2+ dias seguidos não cumpridos (checado antes de 1–3) → `streakAtual = 0`,
   `statusStreak = 'pausado'`

Textos exatos de cada estado (proteção ativada, streak reduzido, retorno após pausa, dia
zerado) vivem em `definition/regras-de-negocio.md` seção 1 — preservar literalmente ao exibir.

### 2. Tarefas recorrentes

- "Repetir todos os dias" gera documento em `essentialTasks` além da tarefa do dia
- Todo `dailyLog` novo nasce pré-populado com as `essentialTasks` ativas
- "Remover só hoje" não afeta a recorrência futura
- "Parar de repetir" desativa (`ativa: false`) sem apagar histórico já gerado

### 3. Desafios semanais e mensais

Catálogo fixo, um semanal + um mensal ativos por vez, gerados automaticamente no início de cada
período (segunda-feira / dia 1):

| Desafio | Período | Meta |
|---|---|---|
| "Exercite-se 3x essa semana" | Semanal | 3 tarefas `tipo: 'exercicio'` concluídas na semana |
| "Cumpra sua essencial todo dia" | Semanal | 7 dias com status `cumprido` ou `protegido_escudo` |
| "20 dias ativos esse mês" | Mensal | 20 dias com status `cumprido` ou `protegido_escudo` |

Qual semanal: alterna por paridade da semana (contada a partir de 2024-01-01). Progresso sempre
recalculado dos `dailyLogs` reais, nunca incrementado manualmente. Meta não atingida no fim do
período → `status: 'expirado'`, sem afetar streak.

### 4. Bloqueio de apps

Sistema antigo (custo crescente por nível) foi removido por completo. Caminho único hoje:
configuração (esta seção) + motor de sessões (seção 5).

- **Detecção:** Accessibility Service (não `UsageStatsManager`+overlay — precisão sobre menor
  escrutínio de loja). Lê só o nome do pacote em primeiro plano; `canRetrieveWindowContent="false"`.
- **Configuração** (Perfil → "Bloqueio de apps"): lista curada de redes sociais (Instagram,
  TikTok, Kwai, Facebook, X, Threads, Reddit, Pinterest, Snapchat, YouTube — constante em
  `src/domain/`, nunca `QUERY_ALL_PACKAGES`). Primeira configuração: tudo marcado exceto YouTube.
  Uma única janela de horário (início, fim, dias da semana) para todos os apps selecionados —
  fim precisa ser depois do início.
- **Medir tempo nas redes:** `UsageStatsManager` independente da interceptação, mede
  tempo/aberturas por app da lista curada. Opt-in (`consentimentoAcessoUso`); sem ele, nada é
  coletado e o bloqueio continua funcionando normalmente.
- **Aviso de bloqueio desligado:** até 2 lembretes locais por desligamento (dia seguinte 09h,
  +3 dias 09h). Nenhum texto usa a palavra "proteção".
- **Divulgação em destaque:** exigência de política da Play Store — tela própria antes de abrir
  as configurações de acessibilidade do Android. Consentimento (`consentimentoAcessibilidade`)
  só é gravado ao tocar "Concordo e quero ativar".

### 5. Motor de sessões, válvulas de escape e rotina noturna

Extensão do bloqueio de apps (detalhe completo em `definition/09-ponte-fuga-tarefa-e-estou-travado.md`).
Caminho único de interceptação: `regrasBloqueio` → `InterceptActivity`.

**Pausa de intenção → Sessão → Cooldown:**
- Pausa de intenção: campo opcional + espera de 10/20/30/40/50/60s (teto) pela posição da sessão
  no dia; dobrada (teto 120s) dentro da janela noturna.
- Sessão: 15 min (`duracaoBlocoMin`), tempo global, só conta com app bloqueado em primeiro
  plano. Sem oferta de tolerância ao terminar.
- Cooldown: 45 min (`cooldownMin`) em tempo corrido, sobrevive a fechar o app/reiniciar.
- Saldo diário: padrão "sem limite" — sempre há próxima sessão após o cooldown. Só número
  (via Firestore) pode zerar e levar a `SALDO_ZERADO`.

Máquina de estados (autoridade em `SaldoBloqueioMaquina.kt`, cópia em `domain/saldoBloqueio.ts`):
```
AGUARDANDO_LIBERACAO ⇄ PAUSA_INTENCAO → SESSAO_ATIVA → COOLDOWN → (AGUARDANDO_LIBERACAO | SALDO_ZERADO)
SALDO_ZERADO → AGUARDANDO_LIBERACAO (tarefa extra concluída)
qualquer estado → reinicia na virada do dia
```

**Válvulas de escape ("OUTRAS SAÍDAS" na interceptação, HU-11):**
- Acesso rápido: 2 min após 5s de espera (30s na janela noturna), cota 3/dia, intervalo mínimo
  15/30/60 min entre usos. Disponível também durante cooldown. Tela própria
  (`EsperaAcessoRapidoScreen`), não mais inline no cooldown.
- Emergência: só quando não há sessão/cooldown liberável/acesso rápido disponível. Respiração
  guiada de 60s sem pular → libera 2 min. Sem limite de usos.
- Sessão de foco e tarefas extras completam a lista (sempre por último, ordem fixa).
- Ordem e disponibilidade calculadas por `domain/valvulas.ts` (`montarValvulas`), puro: acesso
  rápido disponível lidera; indisponível por intervalo e com emergência oferecida, a emergência
  lidera no lugar; nenhuma válvula usa cor de alerta (Cobre) nem texto de negativa.
- Uma sessão ou acesso rápido já em andamento quando a janela noturna começa segue até o fim,
  sem aviso — a janela só vale a partir da próxima pausa/espera que começar depois disso.

**Rotina estimada e janela noturna:** coleta de uso grava `primeiroUsoDia`/
`ultimoUsoAntesPausaLonga`; com 5+ dias de histórico, estima dormir/acordar sem pergunta no
onboarding, oferece confirmação única (`rotina.confirmadoEm`) + pergunta opcional de alternativa
noturna. Janela noturna = 30 min antes de `dormirEstimado` até `acordarEstimado`: pausa de
intenção dobra, texto padrão trocado por mensagem do banco `noturno`, acesso rápido espera 30s
em vez de 5. Editar manualmente liga `rotina.modoManual` (pausa a reestimativa automática).
"Recalcular automaticamente" (HU-10, RN15) desliga `modoManual`, mas não troca os horários na
hora — a estimativa nova (se houver) substitui `dormirEstimado`/`acordarEstimado` uma única vez,
na abertura seguinte do app, mantendo `confirmadoEm`. Fora desse momento, a estimativa automática
nunca altera uma rotina já confirmada — resolve a ambiguidade que existia entre "só muda por
reconfirmação manual" e "uma nova estimativa no ciclo normal".

**TravadoFlow** ("O que está pegando agora?"): caminho independente, acessível pela Home (botão
discreto) e toque longo numa tarefa. 4 chips de toque único (confusão/medo/tédio/energia), cada
um leva a uma ação (subtarefa + timer, timer direto, ou 3 opções no caso de energia baixa).
Sessões de foco (2/5/10 min, qualquer origem) **nunca alteram `streakAtual`**.

**Regra de pré-compromisso (regra única):** primeira configuração de `regrasBloqueio` vale na
hora; qualquer alteração depois (inclusive desativar) só vale a partir do dia seguinte
(`regrasBloqueioPendentes.efetivaEm`), sem distinguir afrouxar de endurecer. Nova alteração
substitui pendência existente. Promoção pendente→vigente acontece no nativo (Kotlin), roda com
o app fechado. `AvisoAlteracaoPendenteScreen` é mostrado antes de gravar qualquer alteração que
viraria pendente, reconhecendo o momento sem culpa (princípio 3).

## Restrições importantes

- **LGPD/privacidade:** Política de Privacidade e Termos de Uso (`docs/legal/`) descrevem o
  comportamento real do app e precisam ser atualizados sempre que um campo novo for gravado em
  `users/{uid}`, um SDK novo coletar dados, o Accessibility Service mudar o que lê, a assinatura
  for lançada, ou o controlador mudar. Mudança relevante na Política exige aviso prévio ao
  usuário (seção 15 dela). Revisão jurídica formal (advogado OAB) ainda pendente antes de
  escalar a base de usuários ou lançar a assinatura.
- **Idade mínima:** 18+ nos dois documentos legais — precisa bater com "Público-alvo" no Play
  Console antes de publicar.
- **Accessibility Service:** permissão mais escrutinada na revisão da Play Store — exige
  justificativa no formulário de submissão, usando o texto já validado na tela de divulgação.
- **Dados sensíveis:** `intencoes` (texto livre da pausa de intenção) é dado pessoal, fica só no
  documento do próprio usuário, nunca enviado ao Analytics com identificador.
- **Acessibilidade:** rótulos, foco, contraste e tamanho de toque não são opcionais (ver
  `boas-praticas.md`).

## Loja e publicação

- Conta de desenvolvedor Google Play: taxa única, necessária antes de qualquer submissão.
  Pacote `com.luxthorapps.rootora` (permanente após 1ª publicação).
- Declaração de Advertising ID: "não usa" (coleta desligada, permissões `AD_ID`/
  `ACCESS_ADSERVICES_*` removidas do manifesto).
- Lista de apps do bloqueio usa `<queries>` curado no manifesto, não `QUERY_ALL_PACKAGES` — sem
  formulário extra de justificativa.
- **Assinatura (7 dias grátis), nenhum dos passos iniciado ainda:**
  1. Criar produto de assinatura no Google Play Console (plano base + oferta 7 dias)
  2. Migrar o projeto Firebase para o plano **Blaze** (pay-as-you-go, cartão cadastrado — avisar
     e confirmar com o Lucas antes, por custo)
  3. Configurar Real-time Developer Notifications (RTDN) via Pub/Sub
  4. Cloud Function de verificação de compra (Google Play Developer API)
  5. Fluxo de compra no app (`react-native-iap`)
  6. Paywall com contagem regressiva dos 7 dias e "Restaurar compra"

## Documentos de origem (histórico)

Conteúdo migrado deste arquivo veio de `definition/01-visao-geral-projeto.md`,
`definition/00-instrucoes-do-projeto.md`, `definition/regras-de-negocio.md`,
`definition/09-ponte-fuga-tarefa-e-estou-travado.md`, `definition/procedimento-loja.md` e
`docs/legal/README.md`. Esses arquivos continuam existindo em `/definition` e `docs/legal/` como
material de origem/histórico — consulte-os para o detalhe linha a linha (ex.: tabela completa de
estados do TravadoFlow, textos exatos de cada marco de streak, critérios de aceite do motor de
sessões) quando este resumo não bastar.
