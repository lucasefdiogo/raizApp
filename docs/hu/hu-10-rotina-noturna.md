# HU-10 — [Rotina] Confirmar o horário de dormir e a alternativa noturna

> Facelift 2026 · 2ª na ordem (HU-07 → **HU-10** → HU-09 → HU-11 → HU-08)
> Protótipo: `docs/hu/hu-10-rotina-noturna.html` (telas 10.1 a 10.4) · visão geral do facelift em `docs/hu/rootora-facelift-visao-geral.html`
> Fontes: `09-ponte-fuga-tarefa-e-estou-travado.md` §5 e §10, `docs/projeto/schema.md` (`users.rotina`, `dailyLogs.usoApps`), `navegacao-componentes.md` (RotinaConfirmacaoScreen, AlternativaNoturnaScreen, RotinaPerfilScreen), `banco-de-frases.md` (tema `noturno`), histórico da HU-06 em `docs/historico/`
> Alimenta a **HU-07** (sugestão noturna), a **HU-09** (resumo e link "Editar" da rotina) e a **HU-11** (pausa noturna)
>
> ⚠️ **Ordem invertida:** pelo facelift, a HU-10 viria antes da HU-09, mas **a HU-09 já foi construída**. Antes de qualquer outra coisa, o `/lux-build` precisa verificar como a HU-09 resolveu a ligação com esta HU (seção 4.1).

---

## 1. Título

**[Rotina] Confirmar o horário de dormir e a alternativa noturna**

## 2. Cartão da HU

* **Como um(a):** pessoa que costuma rolar a tela antes de dormir
* **Eu quero:** confirmar o horário que o app identificou e dizer o que prefiro fazer à noite
* **Para que eu possa:** ter a fricção extra no horário certo, junto com uma alternativa que é minha

## 3. Protótipo / UX UI

Arquivo `docs/hu/hu-10-rotina-noturna.html`:

| Tela | Rota | O que é |
|---|---|---|
| 10.1 | `RotinaConfirmacaoScreen` (HojeStack, condicional) | Horário estimado + efeito em uma linha + "Confirmar" / "Ajustar horário" |
| 10.2 | mesma tela, modo edição | Seletores de dormir e acordar com a linha do efeito recalculada ao vivo |
| 10.3 | `AlternativaNoturnaScreen` (HojeStack, condicional) | Pergunta opcional com sugestões em chips |
| 10.4 | `RotinaPerfilScreen` (PerfilStack) | Edição manual, selo AUTOMÁTICO / AJUSTADO À MÃO, alternativa, "Recalcular automaticamente" |

Regras visuais (design system): fundo Casca, superfícies Areia, ícone de lua em Musgo, horários em Zilla Slab. **Único Cobre de cada tela: o `PrimaryButton`.** Sem emoji.

Decidido na HU-09 (22/out): a edição da rotina é **uma rota só**, a `RotinaPerfilScreen`, no `PerfilStack`. A entrada fica no Perfil (linha "Rotina noturna", criada na HU-09) e o Bloqueio mostra um resumo com "Editar".

## 4. Verificação inicial (antes do plano do `/lux-build`)

O estado de implementação da HU-06 não está confirmado (o roadmap diz "não iniciada"; o `navegacao-componentes.md` descreve as rotas como existentes). Antes de propor o plano, o `/lux-build` deve verificar no código e em `docs/historico/` (HU-06) e **listar no plano** o que já existe:

| Peça | Onde procurar | Se não existir |
|---|---|---|
| Estimativa de rotina a partir de `usoApps` | `src/domain/` (ex.: `rotina.ts`), fixtures | Implementar conforme RN01–RN03 |
| Leitura/gravação de `users/{uid}.rotina` | `src/services/firestore.ts`, `src/hooks/` | Implementar (RN06, RN13) |
| Espelho de `rotina` em SharedPreferences | módulo nativo que já espelha `regrasBloqueio` (`BloqueioPrefs`) | Implementar no mesmo módulo (RN14) |
| Uso da janela noturna na interceptação (pausa dobrada, banco `noturno`) | `SaldoBloqueioMaquina.kt`, `InterceptScreen` | **Fora do escopo.** Registrar no resumo final: fica para a HU-11/HU-06 |
| Rotas `RotinaConfirmacao`, `AlternativaNoturna`, `RotinaPerfil` | `src/navigation/`, `src/screens/` | Implementar (escopo desta HU) |

Se a HU-06 em `docs/historico/` definir algum comportamento diferente das RNs abaixo (por exemplo, outro método de estimativa), **parar e perguntar ao Lucas** antes de seguir.

### 4.1 Ligação com a HU-09 (já construída)

A HU-09 dependia desta HU e foi feita antes dela. Portanto, ela pode ter criado provisórios para as peças que a HU-10 entrega. O `/lux-build` deve ler `docs/hu/hu-09-bloqueio-config.md` e o código da branch já mergeada, e **listar no plano** o que encontrou em cada ponto:

| Ponto de ligação | O que a HU-09 previa | O que verificar | O que fazer |
|---|---|---|---|
| Função `resumoRotina` | Criada pela HU-09 (RN11 dela), em `src/domain/` | Onde ficou, assinatura e as 4 saídas | **Reaproveitar, não duplicar.** Se ficou fora de `src/domain/rotina.ts`, mover para lá sem mudar o comportamento e manter os testes da HU-09 passando |
| Link "Editar" da seção ROTINA NOTURNA no Bloqueio | Abre a `RotinaPerfilScreen` | Para qual rota navega hoje (placeholder, rota inexistente, link escondido ou desabilitado) | Apontar para a `RotinaPerfilScreen` desta HU e remover qualquer condição provisória |
| Linha "Rotina noturna" no Perfil | Abre a `RotinaPerfilScreen` | Idem | Idem |
| Rota `RotinaPerfil` no `PerfilStack` | Criada por esta HU | Se a HU-09 já registrou a rota com uma tela provisória | **Manter o mesmo nome de rota** e trocar a tela provisória pela real; não criar segunda rota |
| Estado "Pronta para confirmar" | Saída de `resumoRotina` | Se a HU-09 mostra esse texto | Continua igual; com esta HU, a confirmação passa a aparecer de fato na abertura do app (RN04) |
| Cores e componentes da HU-09 | `SecaoConfig`, dias em Terra Escura, caixa em Musgo | — | Não alterar. Esta HU não mexe na `BloqueioAppsScreen` além do destino do "Editar" |

Se algum ponto estiver diferente do previsto e a correção exigir mudar comportamento da HU-09 (não só trocar o destino da navegação), **parar e perguntar ao Lucas** antes de alterar. No resumo final, listar o que foi ajustado na parte da HU-09.

Arquivos impactados (estimativa): `src/domain/rotina.ts`, `src/hooks/useRotina.ts`, `src/screens/RotinaConfirmacaoScreen.tsx`, `src/screens/AlternativaNoturnaScreen.tsx`, `src/screens/RotinaPerfilScreen.tsx`, `src/navigation/` (HojeStack e PerfilStack), `src/services/firestore.ts`, `src/native/` + módulo Kotlin do espelho, `src/services/analytics.ts`.

Sem campo novo no Firestore: o mapa `rotina` já existe no schema.

## 5. Regras de Negócio

### Estimativa (domain, funções puras)

* **RN01 — Dias válidos:** conta como dia válido um `dailyLog` dos últimos 14 dias (sem contar hoje) com `usoApps.primeiroUsoDia` **e** `usoApps.ultimoUsoAntesPausaLonga` preenchidos. A estimativa só existe com **5 ou mais dias válidos**.
* **RN02 — Cálculo:** usa os até 7 dias válidos mais recentes. `acordarEstimado` = mediana de `primeiroUsoDia` (hora local). `dormirEstimado` = mediana de `ultimoUsoAntesPausaLonga`; horários entre 00:00 e 05:59 contam como do mesmo "noite" (somam 24h no cálculo, para que 23:50 e 00:20 fiquem próximos). Os dois resultados são arredondados para o múltiplo de 15 min mais próximo e gravados como `HH:mm`.
* **RN03 — Janela noturna:** vai de `dormirEstimado − 30 min` até `acordarEstimado`, podendo atravessar a meia-noite. Uma função pura devolve início e fim da janela para exibição (RN05) e para o espelho nativo (RN14).

### Confirmação (10.1 e 10.2)

* **RN04 — Quando aparece:** a `RotinaConfirmacaoScreen` é rota condicional do `HojeStack`, mostrada ao abrir o app quando há acesso de uso, existe estimativa (RN01) e `rotina.confirmadoEm` está vazio. Se `RecoveryStateScreen` ou `ReturnAfterPauseScreen` também tiverem que aparecer, elas vêm antes, e a confirmação fica para a próxima abertura.
* **RN05 — Conteúdo:** ícone de lua, eyebrow "PADRÃO IDENTIFICADO", título "Parece que você costuma dormir por volta das {dormir}.", texto "Olhamos só os horários em que o celular foi usado nos últimos dias. Nada do que você viu ou digitou.", os dois horários (Dormir / Acordar) e a linha "Entre {início da janela} e {acordar}, abrir as redes vai pedir uma pausa um pouco maior.". Botões: "Confirmar" (`PrimaryButton`) e "Ajustar horário" (`SecondaryButton`). Nunca usa a palavra "proteção" nem fala em regra.
* **RN06 — Confirmar:** grava em `users/{uid}.rotina` os campos `dormirEstimado`, `acordarEstimado`, `confirmadoEm` (hoje, `YYYY-MM-DD`) e `modoManual: false` (ou `true`, se veio do ajuste, RN07), mantendo `alternativaNoturna` como estava. Em seguida navega para a `AlternativaNoturnaScreen`.
* **RN07 — Ajustar horário:** na mesma tela (sem rota nova), o eyebrow vira "AJUSTAR HORÁRIO", o título vira "Quando você costuma dormir e acordar?", os horários viram seletores (`DateTimePicker`) e a linha da janela recalcula ao vivo. Botões: "Confirmar" e o link "Usar o horário estimado" (volta aos valores calculados e ao modo de leitura). Confirmar com horários ajustados grava `modoManual: true`.
* **RN08 — Validação:** dormir e acordar não podem ser iguais; nesse caso o "Confirmar" fica desabilitado e aparece "Os horários de dormir e acordar precisam ser diferentes.".
* **RN09 — Sair sem decidir:** o voltar físico fecha a tela sem gravar nada. Ela só volta a aparecer no dia seguinte (data guardada no AsyncStorage em `rotina_confirmacao_adiada`). Sem confirmação, nada muda na interceptação.

### Alternativa noturna (10.3)

* **RN10 — Quando aparece:** uma única vez, logo depois de "Confirmar" na `RotinaConfirmacaoScreen`. Se o app for fechado nesse meio-tempo, ela não volta; a alternativa continua editável na `RotinaPerfilScreen`.
* **RN11 — Conteúdo:** ícone de livro, título "O que você gostaria de fazer à noite?", texto "Se bater a vontade de rolar a tela perto da hora de dormir, a gente lembra disso.", campo de texto (máx. 40 caracteres, porque vira texto de botão na interceptação) e chips de sugestão que só preenchem o campo: "Ler um pouco", "Preparar o dia de amanhã", "Alongar", "Escrever 3 linhas". Botões: "Salvar" (`PrimaryButton`, desabilitado com o campo vazio ou só com espaços) e "Agora não" (`SecondaryButton`).
* **RN12 — Gravação:** "Salvar" grava `rotina.alternativaNoturna` (texto sem espaços nas pontas). "Agora não" e o voltar físico não gravam nada. Os dois levam para a Home.

### Rotina noturna no Perfil (10.4)

* **RN13 — RotinaPerfilScreen:** título "Rotina noturna" com selo "AUTOMÁTICO" (`modoManual` falso) ou "AJUSTADO À MÃO" (`modoManual` verdadeiro); os dois horários editáveis; a linha "Pausa maior entre {início da janela} e {acordar}, todos os dias."; o campo "No lugar da tela, à noite" (alternativa, mesmas regras da RN11); e o botão "Salvar" (`PrimaryButton`). Salvar com horário alterado grava `modoManual: true`. Salvar só a alternativa não mexe em `modoManual`.
* **RN14 — Sem rotina confirmada:** a tela mostra o estado de `resumoRotina` (HU-09): "Precisa medir o tempo nas redes" com o link "Medir tempo nas redes" (abre a `DivulgacaoAcessoUsoScreen`), ou "Aprendendo seu horário · {n} de 5 dias". Nos dois casos, a pessoa pode definir os horários à mão: salvar grava `confirmadoEm` (hoje) e `modoManual: true`.
* **RN15 — Recalcular automaticamente:** o link só aparece com `modoManual` verdadeiro. Tocar grava `modoManual: false` e mostra o toast "Na próxima abertura, o horário volta a ser estimado.". Os horários atuais continuam valendo. Na próxima abertura do app, se houver estimativa (RN01), ela substitui `dormirEstimado`/`acordarEstimado` uma vez, mantendo `confirmadoEm`. Fora desse caso, a estimativa automática nunca altera uma rotina já confirmada.

### Espelho, privacidade e métricas

* **RN16 — Espelho nativo:** toda gravação de `rotina` (RN06, RN12, RN13, RN15) também atualiza o espelho em SharedPreferences, no mesmo módulo que espelha `regrasBloqueio`, com `dormirEstimado`, `acordarEstimado` e `alternativaNoturna`, e só quando `confirmadoEm` estiver preenchido. Esta HU não altera a máquina de estados nem a `InterceptScreen`.
* **RN17 — Privacidade:** os horários de rotina só aparecem nestas 3 telas e nos resumos de Perfil e Bloqueio (HU-09). Nunca em notificação, toast, Progresso ou Analytics.
* **RN18 — Analytics:** `rotina_confirmada` com `ajustado: boolean`; `alternativa_noturna_respondida` com `acao: 'salvou' | 'agora_nao'`; `rotina_recalculo_pedido`. Nenhum evento leva horário nem o texto da alternativa.
* **RN19 — Sem efeito colateral:** nada nesta HU altera streak, proteção, `statusDia`, desafios ou `regrasBloqueio`.
* **RN20 — Tom:** sem ponto de exclamação; comunica um padrão, nunca uma regra imposta.

## 6. Critérios de Aceite (BDD/Gherkin)

```gherkin
Cenário 1: Estimativa com 5 dias válidos
  Dado que tenho 5 dias nos últimos 14 com primeiroUsoDia e ultimoUsoAntesPausaLonga
  E os últimos usos foram 23:10, 23:40, 00:20, 23:25 e 23:35
  E os primeiros usos foram 06:50, 07:05, 07:20, 06:55 e 07:00
  Quando a estimativa é calculada
  Então dormirEstimado é "23:30"
  E acordarEstimado é "07:00"

Cenário 2: Sem dias suficientes
  Dado que tenho só 4 dias válidos
  Quando abro o app
  Então vou direto para a Home
  E a tela de confirmação não aparece

Cenário 3: Confirmação aparece
  Dado que tenho acesso de uso, 5 dias válidos e rotina.confirmadoEm vazio
  Quando abro o app
  Então vejo "Parece que você costuma dormir por volta das 23:30."
  E vejo "Entre 23:00 e 07:00, abrir as redes vai pedir uma pausa um pouco maior."

Cenário 4: Recaída tem prioridade
  Dado que a confirmação de rotina deveria aparecer
  E ontem foi um dia perdido que ainda não foi exibido
  Quando abro o app
  Então vejo primeiro a tela de recaída
  E a confirmação de rotina fica para a próxima abertura

Cenário 5: Confirmar grava e segue para a alternativa
  Dado que estou na confirmação com 23:30 e 07:00
  Quando toco em "Confirmar"
  Então rotina fica com dormirEstimado "23:30", acordarEstimado "07:00", confirmadoEm de hoje e modoManual falso
  E o espelho nativo recebe os horários
  E vejo "O que você gostaria de fazer à noite?"

Cenário 6: Ajustar antes de confirmar
  Dado que estou na confirmação
  Quando toco em "Ajustar horário" e mudo dormir para 00:00
  Então a linha passa a dizer "Entre 23:30 e 07:00, abrir as redes vai pedir uma pausa um pouco maior."
  E ao tocar em "Confirmar" a rotina é gravada com modoManual verdadeiro

Cenário 7: Horários iguais
  Dado que estou ajustando o horário
  Quando escolho 07:00 para dormir e 07:00 para acordar
  Então o botão "Confirmar" fica desabilitado
  E vejo "Os horários de dormir e acordar precisam ser diferentes."

Cenário 8: Sair sem decidir adia para amanhã
  Dado que estou na confirmação de rotina
  Quando uso o voltar do Android
  Então nada é gravado
  E se eu reabrir o app hoje a confirmação não aparece
  E amanhã ela aparece de novo

Cenário 9: Salvar a alternativa
  Dado que estou em "O que você gostaria de fazer à noite?"
  Quando toco no chip "Ler um pouco" e em "Salvar"
  Então rotina.alternativaNoturna fica "Ler um pouco"
  E volto para a Home

Cenário 10: Pular a alternativa
  Dado que estou em "O que você gostaria de fazer à noite?"
  Quando toco em "Agora não"
  Então nada é gravado
  E a pergunta não aparece de novo

Cenário 11: Salvar desabilitado com campo vazio
  Dado que estou em "O que você gostaria de fazer à noite?" com o campo vazio
  Então o botão "Salvar" está desabilitado

Cenário 12: Editar o horário no Perfil
  Dado que minha rotina está "AUTOMÁTICO" com 23:30 e 07:00
  Quando abro Perfil → Rotina noturna, mudo acordar para 07:30 e toco em "Salvar"
  Então o selo muda para "AJUSTADO À MÃO"
  E vejo "Pausa maior entre 23:00 e 07:30, todos os dias."

Cenário 13: Editar só a alternativa não muda o modo
  Dado que minha rotina está "AUTOMÁTICO"
  Quando mudo só a alternativa para "Preparar o dia de amanhã" e toco em "Salvar"
  Então o selo continua "AUTOMÁTICO"

Cenário 14: Recalcular automaticamente
  Dado que minha rotina está "AJUSTADO À MÃO" com 00:00 e 07:30
  Quando toco em "Recalcular automaticamente"
  Então o selo muda para "AUTOMÁTICO"
  E vejo "Na próxima abertura, o horário volta a ser estimado."
  E os horários continuam 00:00 e 07:30 até a próxima abertura

Cenário 15: Nova estimativa após recalcular
  Dado que pedi para recalcular e a estimativa atual é 23:30 e 07:00
  Quando abro o app de novo
  Então a rotina passa a 23:30 e 07:00
  E confirmadoEm continua o mesmo
  E a tela de confirmação não aparece

Cenário 16: Definir à mão sem estimativa
  Dado que nunca concedi o acesso de uso
  Quando abro Perfil → Rotina noturna
  Então vejo "Precisa medir o tempo nas redes" e o link "Medir tempo nas redes"
  E se eu definir 23:00 e 06:30 e tocar em "Salvar", a rotina fica confirmada e "AJUSTADO À MÃO"

Cenário 17: Horário nunca vai para o Analytics
  Dado que confirmei a rotina com horários ajustados
  Quando o evento "rotina_confirmada" é registrado
  Então ele tem ajustado verdadeiro
  E não contém horários nem o texto da alternativa

Cenário 18: "Editar" do Bloqueio abre a tela real
  Dado que a HU-09 já está na main
  E estou em Perfil → Bloqueio de apps
  Quando toco em "Editar" na seção "ROTINA NOTURNA"
  Então abre a tela "Rotina noturna" desta HU
  E não existe nenhuma tela provisória no caminho

Cenário 19: Linha do Perfil abre a mesma tela
  Dado que estou no Perfil
  Quando toco na linha "Rotina noturna"
  Então abre a mesma tela "Rotina noturna", pela mesma rota usada pelo Bloqueio

Cenário 20: Resumos da HU-09 refletem a confirmação
  Dado que a seção "ROTINA NOTURNA" do Bloqueio mostrava "Pronta para confirmar"
  Quando confirmo a rotina com 23:30 e 07:00
  Então o Bloqueio passa a mostrar "Dormir 23:30 · Acordar 07:00" e "Pausa maior entre 23:00 e 07:00"
  E a linha do Perfil passa a mostrar "23:30 – 07:00"

Cenário 21: Testes da HU-09 continuam passando
  Dado que resumoRotina foi reaproveitada ou movida para src/domain/rotina.ts
  Quando rodo npm test
  Então os testes "HU-09 · ..." continuam passando sem alteração de comportamento
```

## 7. Testes sugeridos (Jest + @testing-library/react-native)

Seguindo o CLAUDE.md: `describe('HU-10 · Rotina noturna', ...)` e `it('Cenário N: ...')`.

- `domain/rotina.ts` (prioridade): dias válidos (RN01) com campos faltando e janela de 14 dias, mediana com horários depois da meia-noite, arredondamento de 15 min, janela atravessando a meia-noite, horários iguais
- `RotinaConfirmacaoScreen`: modos leitura e ajuste, linha da janela ao vivo, validação, gravação com `modoManual` certo
- Navegação condicional do `HojeStack`: prioridade de recaída/retorno e adiamento por `rotina_confirmacao_adiada`
- `AlternativaNoturnaScreen`: chip preenche, limite de 40 caracteres, "Salvar" desabilitado com campo vazio
- `RotinaPerfilScreen`: selo, salvar só a alternativa, recalcular, estados sem rotina
- Espelho nativo: mockar o módulo e verificar a chamada a cada gravação com `confirmadoEm`

## 8. Pendências

- **Ordem invertida com a HU-09:** ver seção 4.1. Se a HU-09 deixou provisórios, eles são substituídos aqui, e o resumo final deve dizer o que mudou na parte dela. Atualizar o `roadmap-e-status.md` com a HU-09 como feita e a HU-10 em andamento.

- **Contradição na spec 09 §5:** a spec diz que "a estimativa em si só muda por reconfirmação manual" e também que "Recalcular automaticamente" permite "uma nova estimativa no ciclo normal". Esta HU resolve assim (RN15): a estimativa automática nunca altera uma rotina confirmada, exceto uma vez, na abertura seguinte ao "Recalcular". Atualizar a spec 09 e o `docs/projeto/spec.md` na mesma branch.
- **Comportamentos definidos aqui que não estavam em nenhum documento:** o método de estimativa (RN02, mediana dos 7 dias válidos mais recentes) e o adiamento para o dia seguinte ao sair sem decidir (RN09). Se a HU-06 em `docs/historico/` definir algo diferente, ela prevalece (ver seção 4).
- **Efeito na interceptação** (pausa dobrada, mensagem do banco `noturno`, botão da alternativa): fora do escopo desta HU, fica para a HU-11. Se a verificação inicial mostrar que a máquina nativa ainda não lê o espelho, registrar no resumo final.
