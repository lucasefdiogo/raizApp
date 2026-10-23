# HU-11 — [Interceptação] Linguagem única para a interceptação e as válvulas

> Facelift 2026 · 4ª na ordem (HU-07 → HU-10 → HU-09 → **HU-11** → HU-08)
> Protótipo: `docs/hu/hu-11-interceptacao.html` (mapa do fluxo + telas 11.1 a 11.7) · visão geral do facelift em `docs/hu/rootora-facelift-visao-geral.html`
> Fontes: `09-ponte-fuga-tarefa-e-estou-travado.md` §2–§5 e §10–§13, `navegacao-componentes.md` (root `Intercept`), `docs/projeto/spec.md` (motor de sessões, válvulas, janela noturna), `banco-de-frases.md` (tema `noturno`), `docs/projeto/design-system.md`, histórico das HU-04/05/06 em `docs/historico/`
> Depende da **HU-10** (rotina confirmada e espelho nativo de `rotina`)

---

## 1. Título

**[Interceptação] Linguagem única para a interceptação e as válvulas**

## 2. Cartão da HU

* **Como um(a):** pessoa que abriu uma rede social no automático
* **Eu quero:** entender em segundos onde estou (pausa, sessão, espera) e quais saídas eu tenho
* **Para que eu possa:** escolher conscientemente, em vez de desativar o bloqueio

## 3. Protótipo / UX UI

Arquivo `docs/hu/hu-11-interceptacao.html`:

| Tela | Estado da máquina | O que é |
|---|---|---|
| 11.1 | `AGUARDANDO_LIBERACAO` → pausa de intenção | Botão desabilitado com a contagem; vira "Liberar 15 min" |
| 11.2 | pausa de intenção na janela noturna | Frase do banco `noturno`, espera dobrada, botão da alternativa noturna |
| 11.3 | `COOLDOWN` com acesso rápido disponível | Contagem grande + barra + "OUTRAS SAÍDAS" |
| 11.4 | `COOLDOWN` sem acesso rápido | Acesso rápido esmaecido com o tempo; emergência no topo |
| 11.5 | Emergência | Respiração de 60s, sem pular |
| 11.6 | `SALDO_ZERADO` | Sem contagem; tarefas extras e sessão de foco |
| 11.7 | `SESSAO_ATIVA` · último minuto | Aviso não bloqueante "1 minuto restante" |

Regras visuais (design system): fundo Casca, superfícies Areia, eyebrow em Space Mono, headline e contagens em Zilla Slab, válvulas com ícone em círculo Musgo. **No máximo 1 Cobre por tela, e as válvulas nunca usam Cobre.** Sem emoji.

**Fora do protótipo, definido nesta HU:** a tela de espera do acesso rápido (RN09), que segue o mesmo esqueleto.

**Decisões tomadas em 22/out:**
1. Uma sessão (ou acesso rápido) em andamento quando a janela noturna começa **segue até o fim**, sem aviso. A regra noturna vale a partir da próxima pausa de intenção ou espera de acesso rápido.
2. Se a interceptação ainda não aplicar a janela noturna, **esta HU implementa o que faltar**, inclusive no nativo (seção 4).

## 4. Verificação inicial (antes do plano do `/lux-build`)

As HU-04, HU-05 e HU-06 constam como 🚧 (não confirmadas em device físico) ou não iniciadas. A HU-10 deixou o efeito noturno na interceptação para esta HU. Antes de propor o plano, o `/lux-build` deve verificar no código e em `docs/historico/` e **listar no plano** o estado de cada peça:

| Peça | Onde procurar | Se não existir ou estiver incompleta |
|---|---|---|
| Telas `PausaIntencaoScreen`, `EsperaBloqueioScreen`, `SessaoFocoScreen`, `TarefasExtrasScreen` | `src/screens/` ou `src/components/intercept/` do root `Intercept` | Redesenhar as existentes. Se alguma não existir, parar e perguntar (o motor das HU-04/05 é pré-requisito) |
| Acesso rápido (espera de 5s, cota 3/dia, intervalos 15/30/60) e emergência (60s) | `SaldoBloqueioMaquina.kt`, `domain/saldoBloqueio.ts` | Parar e perguntar: é escopo da HU-05, não desta |
| Leitura do espelho de `rotina` pelo nativo | `BloqueioPrefs` / `SaldoBloqueioMaquina.kt` | Implementar (RN13) |
| Cálculo da janela noturna no nativo e no JS | `SaldoBloqueioMaquina.kt` + `domain/` (cópia de referência) | Implementar com as mesmas fixtures nos dois lados (RN13) |
| Pausa dobrada (teto 120s) e espera de 30s no acesso rápido dentro da janela | máquina nativa | Implementar (RN06, RN09) |
| Rotação do banco `noturno` sem repetir a mesma frase em seguida | root `Intercept` | Implementar (RN07) |
| Prop `rotinaJson` no `InterceptRoot` | `InterceptRoot.tsx` | Implementar |
| Aviso "1 minuto restante" | nativo ou root `Intercept` | Manter o mecanismo atual e só alinhar texto e visual (RN12) |

Se algum comportamento existente divergir das RNs abaixo (ex.: ordem das válvulas, condição de exibição), **parar e perguntar ao Lucas** antes de mudar a lógica. Esta HU muda a **apresentação**; a máquina de estados só muda nos pontos noturnos da tabela.

Arquivos impactados (estimativa): `src/components/intercept/InterceptLayout.tsx` (novo), `src/components/intercept/AppChip.tsx` (novo), `src/components/intercept/ValvulaRow.tsx` (novo), `src/components/intercept/ContagemEspera.tsx` (novo), as telas do root `Intercept`, `src/domain/janelaNoturna.ts` (ou dentro de `rotina.ts` da HU-10), `domain/__fixtures__/` (casos noturnos), `SaldoBloqueioMaquina.kt` / `BloqueioPrefs.kt` (se faltar), `src/services/analytics.ts`.

## 5. Regras de Negócio

### Estrutura comum

* **RN01 — Esqueleto único:** toda tela do root `Intercept` segue a ordem: `AppChip` (ícone `iconeBase64` + nome do app vindo de `appLabel`) → eyebrow do estado → headline Zilla → conteúdo do estado → ação principal → bloco "OUTRAS SAÍDAS" (quando houver válvula) → link "Voltar ao início" (leva à tela inicial do Android, como o "Sair" atual).
* **RN02 — ValvulaRow:** componente único para as 4 saídas, dentro de um card Areia com divisórias: ícone em círculo com borda Musgo (zap = acesso rápido, wind = emergência, timer = sessão de foco, list-checks = tarefas extras), título, descrição de uma linha e meta em Space Mono à direita. **Indisponível:** ícone e borda esmaecidos, título em Terra Suave, descrição "Próximo disponível em {n} min" e meta "EM {n} MIN". Nunca texto de negativa ("bloqueado", "acabou", "não pode").

### Pausa de intenção (11.1 e 11.2)

* **RN03 — Padrão:** eyebrow "{n}ª SESSÃO HOJE" (posição da sessão no dia, a partir de 1), headline "O que você vai fazer agora?", campo opcional (placeholder "Opcional. Ex.: responder a turma"), linha "Uma pausa curta antes de abrir. Se sair desta tela, ela recomeça.". A sequência de espera (10/20/30/40/50/60s) não muda.
* **RN04 — Botão com a contagem:** enquanto a espera corre, o botão principal fica desabilitado (fundo neutro, texto Space Mono) com "Liberar em {m:ss}". Ao zerar, vira `PrimaryButton` "Liberar {duracaoBlocoMin} min". Não existe outro timer na tela.
* **RN05 — Janela noturna:** com rotina confirmada e o horário atual dentro da janela (`dormir − 30 min` até `acordar`, HU-10), o eyebrow vira "JANELA NOTURNA · {n}ª SESSÃO", a headline vira uma frase do banco `noturno` (Zilla itálico, peso 500) e o placeholder do campo vira "O que você vai fazer agora? (opcional)".
* **RN06 — Espera dobrada:** dentro da janela, a espera é o dobro da posição atual, com teto de 120s (20/40/60/80/100/120).
* **RN07 — Rotação noturna:** as frases do banco `noturno` são usadas em ordem sequencial, sem repetir a mesma frase duas vezes seguidas para a mesma pessoa (índice da última frase guardado localmente no root `Intercept`).
* **RN08 — Alternativa noturna:** com `rotina.alternativaNoturna` preenchida e dentro da janela, aparece um `SecondaryButton` acima do botão principal, com ícone de livro e o texto "{alternativaNoturna} em vez disso". Tocar fecha a interceptação e leva à tela inicial do Android, sem liberar a sessão e sem avançar a posição da sessão. Sem alternativa cadastrada, o botão não aparece.

### Acesso rápido (definido nesta HU)

* **RN09 — Espera do acesso rápido:** ao escolher "Acesso rápido", a tela mostra o eyebrow "ACESSO RÁPIDO", a headline "Liberando 2 minutos" e a contagem grande da espera (5s; 30s dentro da janela noturna). Dentro da janela, a headline vira a frase do banco `noturno` (RN07) e aparece o botão da alternativa (RN08). Ao zerar, o app abre direto. "Voltar ao início" cancela sem gastar a cota.

### Pausa entre sessões (11.3 e 11.4)

* **RN10 — Cooldown:** eyebrow "PAUSA ENTRE SESSÕES", contagem em Zilla grande ("32 min", arredondado para cima; abaixo de 1 min, "{s} s"), linha "até a próxima sessão de {duracaoBlocoMin} min" e barra Musgo com o tempo **já passado** do cooldown. Atualiza a cada segundo, como hoje.
* **RN11 — Ordem das válvulas:** com acesso rápido disponível: Acesso rápido ("2 minutos, depois de 5s"; meta "{restantes} DE 3 HOJE") → Sessão de foco ("5 minutos, sem tarefa"; meta "5 MIN") → Tarefas extras (quando a condição atual de exibição for verdadeira; meta = quantidade pendente, omitida se zero). Com acesso rápido indisponível por intervalo: Saída de emergência no topo ("Respirar 60s e liberar 2 min"; meta "SEM LIMITE") → Acesso rápido esmaecido (RN02) → Sessão de foco → Tarefas extras. Com a cota do dia esgotada, o acesso rápido esmaecido mostra "Volta amanhã" e meta "AMANHÃ". As condições de disponibilidade não mudam.

### Emergência, saldo zerado e sessão ativa

* **RN12 — Emergência (11.5):** eyebrow "SAÍDA DE EMERGÊNCIA", círculo Musgo que cresce em 5s ("Inspire") e diminui em 5s ("Solte o ar"), contagem de 60s em Space Mono, texto "Acompanhe o círculo. No fim, o {app} fica liberado por 2 minutos." e rodapé "Esta pausa não tem como pular.". Sem botões além do voltar físico, que cancela sem liberar. Com "reduzir movimento" ativo no Android, o círculo fica parado e só a contagem e o texto alternam.
* **RN13 — Motor noturno (se faltar, seção 4):** o nativo lê o espelho de `rotina` (HU-10) e calcula se o horário atual está dentro da janela, com a mesma função de referência em `domain/` e as mesmas fixtures (Jest e JUnit). A janela só se aplica com `confirmadoEm` preenchido. Uma sessão ou acesso rápido já em andamento quando a janela começa **segue até o fim**; a regra noturna vale a partir da próxima pausa de intenção ou espera de acesso rápido. Cota e intervalos do acesso rápido não mudam dentro da janela.
* **RN14 — Saldo zerado (11.6):** só com `blocosDiarios` numérico. Eyebrow "SESSÕES DE HOJE ENCERRADAS", headline "Por hoje, as sessões acabaram.", texto "Amanhã elas voltam. Enquanto isso, dá pra:" e as válvulas Tarefas extras ("Concluir uma devolve uma sessão") e Sessão de foco. Sem contagem e sem pausa de intenção.
* **RN15 — Último minuto (11.7):** o aviso de 1 minuto restante usa o texto "1 minuto restante". Se for renderizado pelo RN, usa o visual do `Toast` (fundo Terra Escura, texto Areia, ~3s). Se for nativo, só o texto é alinhado. Não oferece tolerância nem botão.

### Geral

* **RN16 — Cores:** no máximo 1 Cobre por tela (o botão "Liberar", quando habilitado). Contagens em Terra Escura; barra e ícones em Musgo.
* **RN17 — Analytics:** mantém `intercept_shown` (com `janela_noturna`). Novos: `valvula_escolhida` com `tipo: 'acesso_rapido' | 'emergencia' | 'sessao_foco' | 'tarefas_extras'` e `janela_noturna`; `alternativa_noturna_escolhida` sem parâmetros. Nenhum evento leva a intenção digitada, o texto da alternativa ou o horário da rotina.
* **RN18 — Sem efeito colateral:** sessões, válvulas e janela noturna nunca alteram streak, proteção ou `statusDia`. `resumoBloqueio` continua gravado como hoje.
* **RN19 — Tom:** sem ponto de exclamação, sem a palavra "proteção", sem "bloqueado" como título. A janela noturna é comunicada como padrão da pessoa, não como regra imposta.

## 6. Critérios de Aceite (BDD/Gherkin)

```gherkin
Cenário 1: Esqueleto comum
  Dado que abro o Instagram dentro da janela de bloqueio
  Quando a interceptação aparece em qualquer estado
  Então vejo o chip com o ícone e o nome "Instagram" no topo
  E vejo o eyebrow do estado e a headline
  E vejo o link "Voltar ao início"

Cenário 2: Contagem dentro do botão
  Dado que já liberei 2 sessões hoje, fora da janela noturna
  Quando abro o Instagram
  Então vejo "3ª SESSÃO HOJE" e "O que você vai fazer agora?"
  E o botão mostra "Liberar em 0:30" desabilitado

Cenário 3: Botão libera ao zerar
  Dado que estou na pausa de intenção
  Quando a contagem chega a zero
  Então o botão vira "Liberar 15 min" em Cobre
  E ao tocar o app abre com uma sessão de 15 minutos

Cenário 4: Sair reinicia a pausa
  Dado que estou na pausa de intenção com 0:12 restantes
  Quando toco em "Voltar ao início" e abro o Instagram de novo
  Então a contagem recomeça do início

Cenário 5: Pausa noturna com alternativa
  Dado que confirmei a rotina com dormir 23:30 e acordar 07:00
  E cadastrei a alternativa "Ler um pouco"
  E são 23:41 e já liberei 2 sessões hoje
  Quando abro o Instagram
  Então vejo "JANELA NOTURNA · 3ª SESSÃO"
  E vejo uma frase do banco noturno no lugar da pergunta
  E o botão mostra "Liberar em 1:00"
  E vejo o botão "Ler um pouco em vez disso"

Cenário 6: Escolher a alternativa não libera
  Dado que estou na pausa noturna
  Quando toco em "Ler um pouco em vez disso"
  Então a interceptação fecha e vou para a tela inicial do Android
  E nenhuma sessão é liberada
  E a próxima pausa continua na mesma posição

Cenário 7: Frases noturnas não se repetem em seguida
  Dado que vi a frase "O feed vai estar do mesmo jeito de manhã." na última pausa noturna
  Quando a pausa noturna aparece de novo
  Então a frase exibida é outra

Cenário 8: Sessão atravessa o início da janela
  Dado que liberei uma sessão de 15 minutos às 22:55
  E a janela noturna começa às 23:00
  Quando chegam as 23:00 com o Instagram aberto
  Então a sessão continua até completar os 15 minutos, sem aviso extra
  E a próxima pausa de intenção já usa a regra noturna

Cenário 9: Sem rotina confirmada não há regra noturna
  Dado que não confirmei a rotina
  Quando abro o Instagram às 23:41
  Então vejo a pausa padrão "O que você vai fazer agora?" com a espera normal

Cenário 10: Pausa entre sessões com acesso rápido
  Dado que estou em cooldown com 32 minutos restantes
  E usei 1 de 3 acessos rápidos há mais de 15 minutos
  Quando abro o Instagram
  Então vejo "PAUSA ENTRE SESSÕES" e "32 min"
  E em "OUTRAS SAÍDAS" o primeiro item é "Acesso rápido" com "2 DE 3 HOJE"
  E nenhuma válvula usa Cobre

Cenário 11: Acesso rápido espera e abre
  Dado que estou na pausa entre sessões, fora da janela noturna
  Quando toco em "Acesso rápido"
  Então vejo "ACESSO RÁPIDO", "Liberando 2 minutos" e a contagem de 5 segundos
  E ao zerar o Instagram abre por 2 minutos

Cenário 12: Acesso rápido na janela noturna
  Dado que estou na pausa entre sessões às 23:50, com rotina confirmada
  Quando toco em "Acesso rápido"
  Então a espera é de 30 segundos
  E vejo uma frase do banco noturno e o botão da minha alternativa

Cenário 13: Acesso rápido indisponível revela a emergência
  Dado que estou em cooldown e usei o 1º acesso rápido do dia há 7 minutos
  Quando abro o Instagram
  Então o primeiro item de "OUTRAS SAÍDAS" é "Saída de emergência" com "SEM LIMITE"
  E "Acesso rápido" aparece esmaecido com "Próximo disponível em 8 min" e "EM 8 MIN"

Cenário 14: Cota do dia esgotada
  Dado que já usei os 3 acessos rápidos de hoje
  Quando estou na pausa entre sessões
  Então "Acesso rápido" aparece esmaecido com "Volta amanhã" e "AMANHÃ"

Cenário 15: Respiração sem pular
  Dado que escolhi "Saída de emergência"
  Quando a respiração começa
  Então vejo o círculo alternando "Inspire" e "Solte o ar" e a contagem de 60 segundos
  E vejo "Esta pausa não tem como pular."
  E ao fim o Instagram fica liberado por 2 minutos

Cenário 16: Reduzir movimento
  Dado que o Android está com "remover animações" ativo
  Quando a respiração de emergência começa
  Então o círculo fica parado
  E só a contagem e o texto mudam

Cenário 17: Saldo zerado
  Dado que blocosDiarios é 4 e já usei as 4 sessões de hoje
  Quando abro o Instagram
  Então vejo "SESSÕES DE HOJE ENCERRADAS" e "Por hoje, as sessões acabaram."
  E vejo "Tarefas extras" com "Concluir uma devolve uma sessão" e "Sessão de foco"
  E não vejo contagem nem pausa de intenção

Cenário 18: Aviso de último minuto
  Dado que estou numa sessão ativa no Instagram
  Quando falta 1 minuto
  Então vejo "1 minuto restante" por cima do app
  E posso continuar usando sem tocar em nada

Cenário 19: Analytics sem dado pessoal
  Dado que escolhi "Acesso rápido" dentro da janela noturna
  Quando o evento "valvula_escolhida" é registrado
  Então ele tem tipo "acesso_rapido" e janela_noturna verdadeiro
  E não contém intenção, alternativa nem horário da rotina
```

## 7. Testes sugeridos (Jest + @testing-library/react-native; JUnit no nativo)

Seguindo o CLAUDE.md: `describe('HU-11 · Linguagem única da interceptação', ...)` e `it('Cenário N: ...')`.

- `domain/` (prioridade): janela noturna atravessando a meia-noite, espera dobrada com teto, sessão em andamento não afetada pelo início da janela, rotação do banco `noturno` sem repetição. **Os casos noturnos entram em `domain/__fixtures__/` e rodam no Jest e no JUnit**, como as fixtures atuais da máquina
- `ValvulaRow`: estados disponível, indisponível por intervalo e cota esgotada (sem texto de negativa)
- `EsperaBloqueioScreen`: ordem das válvulas nos 3 cenários (RN11), contagem e barra
- `PausaIntencaoScreen`: botão com contagem, habilitado ao zerar, variante noturna com e sem alternativa
- Emergência: sem botão de pular, variante com movimento reduzido
- Teste manual obrigatório em device físico (pendência 🚧 das HU-04/05/06): pausa, sessão, cooldown, acesso rápido, emergência e janela noturna (pelo `InterceptDebugScreen`)

## 8. Pendências

- Nenhuma decisão de produto em aberto: as duas questões desta HU foram decididas em 22/out (seção 3).
- Atualizar na mesma branch: `09-ponte-fuga-tarefa-e-estou-travado.md` e `docs/projeto/spec.md` (sessão que atravessa a janela, espera do acesso rápido), `navegacao-componentes.md` (componentes novos do root `Intercept`), `docs/projeto/design-system.md` (`ValvulaRow`, `AppChip`, `InterceptLayout`) e `roadmap-e-status.md` (§11 e §14, e o item da sessão na janela noturna saindo do §15).
