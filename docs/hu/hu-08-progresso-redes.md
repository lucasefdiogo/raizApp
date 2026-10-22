# HU-08 — [Progresso] Tempo nas redes e reflexão da semana

> Facelift 2026 · 5ª na ordem (HU-07 → HU-10 → HU-09 → HU-11 → **HU-08**)
> Protótipo: `docs/hu/hu-08-progresso-redes.html` (telas 08.1 a 08.4) · visão geral do facelift em `docs/hu/rootora-facelift-visao-geral.html`
> Fontes: `docs/projeto/schema.md` (`dailyLogs.resumoBloqueio`, `dailyLogs.usoApps`, `consentimentoAcessoUso`), `docs/projeto/spec.md` (regras de streak, desafios e privacidade), `navegacao-componentes.md` (ProgressoScreen, DayDetailSheet), `roadmap-e-status.md` §6 e §17

---

## 1. Título

**[Progresso] Tempo nas redes e reflexão da semana**

## 2. Cartão da HU

* **Como um(a):** pessoa que quer reduzir o uso das redes sociais
* **Eu quero:** ver quanto tempo e quantas sessões usei na semana, e o que escrevi antes de abrir cada rede
* **Para que eu possa:** refletir sobre o meu padrão sem me sentir julgada

## 3. Protótipo / UX UI

Arquivo `docs/hu/hu-08-progresso-redes.html`:

| Tela | Estado | O que muda |
|---|---|---|
| 08.1 | Progresso com acesso de uso | Novo `ResumoRedesCard` entre a faixa de 7 dias e os desafios: tempo da semana, barras por dia, comparação com a semana anterior e 3 contadores |
| 08.2 | Progresso sem acesso de uso | O mesmo card só com os contadores do bloqueio e o link "Medir tempo" |
| 08.3 | Detalhe do dia | `DayDetailSheet` ganha o bloco "NAS REDES" com tempo, sessões, apps e as intenções escritas na pausa |
| 08.4 | Reflexão da semana | Bottom sheet mostrado uma vez às segundas, só com fatos da semana anterior |

**Ignorar no protótipo 08.4:** o bloco tracejado "Decisão pendente · RN07" (proposta de redução). Ele está fora do escopo desta HU (ver RN11 e Pendências).

Regras visuais (design system): números em Zilla Slab e Terra Escura, barras em Musgo, rótulos em Space Mono, superfície Areia. **Único Cobre da tela:** a pílula de hoje na faixa de 7 dias. Aumento de uso nunca em vermelho (nem `erro`, nem Cobre).

Arquivos impactados (estimativa, confirmar no código):
- `src/domain/resumoRedes.ts` (novo): funções puras de agregação semanal e diária, formatação de duração e texto de comparação
- `src/hooks/useResumoRedes.ts` (novo): lê os `dailyLogs` necessários via `services/` e entrega o resumo pronto
- `src/components/progress/ResumoRedesCard.tsx` (novo, burro)
- `src/components/progress/ReflexaoSemanalSheet.tsx` (novo, burro)
- `src/components/progress/DayDetailSheet.tsx`: bloco "NAS REDES"
- `src/screens/ProgressoScreen.tsx`: monta o card e decide se mostra a reflexão
- `src/services/analytics.ts`: 2 eventos novos, sem dados pessoais (RN12)

Sem campo novo no Firestore e sem escrita nova: a HU **só lê** `resumoBloqueio` e `usoApps`, que já são gravados.

## 4. Regras de Negócio

* **RN01 — Período:** a semana vai de segunda a domingo, pela data local (`YYYY-MM-DD` dos `dailyLogs`). O card mostra a semana corrente até hoje; a comparação e a reflexão usam a semana anterior completa. O hook lê os `dailyLogs` desde a segunda-feira da semana anterior até hoje (no máximo 14 documentos).
* **RN02 — Fontes:** os contadores somam `resumoBloqueio.sessoesUsadas`, `.acessosRapidos` e `.emergencias` dos dias da semana. O tempo soma `usoApps[packageName].segundos` de todos os pacotes da lista curada, ignorando as chaves `primeiroUsoDia` e `ultimoUsoAntesPausaLonga`. Documento ou campo ausente conta como zero.
* **RN03 — Com acesso de uso** (`consentimentoAcessoUso` preenchido): o `ResumoRedesCard` mostra o eyebrow "REDES SOCIAIS · ESTA SEMANA", o tempo total da semana, 7 barras (seg a dom) proporcionais ao maior dia da semana (dia sem dado = barra vazia; hoje = barra tracejada, porque o dia ainda está aberto) e os 3 contadores: "SESSÕES", "ACESSOS RÁPIDOS" e "EMERGÊNCIAS".
* **RN04 — Sem acesso de uso:** o card mostra o eyebrow "BLOQUEIO · ESTA SEMANA", só os 3 contadores, e a linha "Quer ver quanto tempo passa nas redes?" com o link "Medir tempo", que abre a `DivulgacaoAcessoUsoScreen` existente. Nenhum dado de uso é lido.
* **RN05 — Formato de duração:** horas e minutos arredondados para baixo: "6h 40min", "52 min", "1h". Menos de 1 minuto: "menos de 1 min". Semana sem nenhum uso medido: "0 min".
* **RN06 — Comparação:** só aparece se a semana anterior tiver pelo menos 4 dias com `usoApps`. Diferença menor que 5 min: "Quase igual à semana passada". Queda: "{duração} a menos que a semana passada". Alta: "{duração} a mais que a semana passada". As três na mesma cor neutra (Terra Suave), sem adjetivo e sem ícone de seta.
* **RN07 — Detalhe do dia:** no `DayDetailSheet`, quando o dia tem `resumoBloqueio` ou `usoApps`, aparece o bloco "NAS REDES" com: tempo do dia (só com acesso de uso), "{n} sessões · {n} acesso rápido" (e "· {n} emergência" quando > 0), os 2 apps com mais tempo no dia ("Instagram 31 min · TikTok 21 min") e, se houver, as intenções do dia sob o rótulo "O QUE VOCÊ ESCREVEU NA PAUSA". Sem nenhum dos dois campos, o bloco não aparece.
* **RN08 — Apps por nome:** pacotes do mesmo app são somados sob o nome da lista curada (ex.: os 2 pacotes do TikTok viram "TikTok"; Facebook e Facebook Lite viram "Facebook").
* **RN09 — Intenções:** mostradas entre aspas, na ordem em que foram escritas, ignorando textos vazios ou só com espaços, até 5; acima disso, "+{n}". São dado pessoal: aparecem só nesta tela, para a própria pessoa, e nunca vão para o Analytics, logs ou qualquer outro lugar.
* **RN10 — Reflexão da semana:** o `ReflexaoSemanalSheet` abre uma única vez, na primeira abertura da aba Progresso a partir da segunda-feira, se houver acesso de uso e a semana anterior tiver pelo menos 4 dias com `usoApps`. Conteúdo: eyebrow "SEMANA DE {dd} A {dd} DE {mês}", título "Sua semana nas redes", uma frase com o total e a comparação (RN06, quando houver base) e o app principal ("O {app} ficou com mais da metade." se ele passou de 50% do tempo; senão "O {app} foi o que mais ocupou."), e 3 números: média por dia, dia mais longo (abreviado: "qui") e total de aberturas (`usoApps[*].aberturas`). Botão "Entendi" (PrimaryButton) e link "Agora não"; os dois só fecham.
* **RN11 — Fora do escopo:** a reflexão não propõe desafio nem meta. A proposta de redução como desafio (bloco tracejado do protótipo 08.4) depende de decisão (ver Pendências) e não deve ser implementada.
* **RN12 — Controle de exibição:** a semana em que a reflexão já foi mostrada fica salva no AsyncStorage em `reflexao_semanal_vista` (data da segunda-feira, `YYYY-MM-DD`), no mesmo padrão de `tutorial_visto`. Analytics: `reflexao_semanal_exibida` e `reflexao_semanal_fechada` (`acao: 'entendi' | 'agora_nao'`), sem nenhum número de uso, nome de app ou intenção.
* **RN13 — Sem efeito colateral:** ler ou exibir esses dados nunca altera `streakAtual`, `statusDia`, proteção, desafios ou qualquer documento do Firestore.
* **RN14 — Privacidade da rotina:** nenhum número desta HU pode revelar o horário estimado de dormir ou acordar (`primeiroUsoDia`, `ultimoUsoAntesPausaLonga` e `rotina` não são exibidos nem usados no cálculo).
* **RN15 — Tom:** sem ponto de exclamação, sem ranking, sem comparação com outras pessoas, sem palavras de julgamento ("demais", "excesso", "melhorou", "piorou").

## 5. Critérios de Aceite (BDD/Gherkin)

```gherkin
Cenário 1: Resumo da semana com acesso de uso
  Dado que concedi o acesso de uso
  E nesta semana usei redes sociais por 6h 40min, com 18 sessões, 5 acessos rápidos e 1 emergência
  Quando abro a aba Progresso
  Então vejo o card "REDES SOCIAIS · ESTA SEMANA" com "6h 40min"
  E vejo 7 barras de segunda a domingo, com a de hoje tracejada
  E vejo "18" sessões, "5" acessos rápidos e "1" emergência

Cenário 2: Resumo sem acesso de uso
  Dado que nunca concedi o acesso de uso
  E nesta semana tive 18 sessões, 5 acessos rápidos e 1 emergência
  Quando abro a aba Progresso
  Então vejo o card "BLOQUEIO · ESTA SEMANA" só com os 3 contadores
  E vejo o link "Medir tempo"
  E não vejo tempo de uso nem barras

Cenário 3: Link leva à divulgação do acesso de uso
  Dado que estou vendo o card sem acesso de uso
  Quando toco em "Medir tempo"
  Então abre a tela de divulgação do acesso de uso

Cenário 4: Comparação neutra quando o uso sobe
  Dado que a semana passada teve 5 dias com dados de uso e 6h no total
  E nesta semana já usei 6h 40min
  Quando vejo o card
  Então leio "40 min a mais que a semana passada"
  E o texto usa a mesma cor neutra usada para a queda

Cenário 5: Diferença pequena
  Dado que a semana passada teve 6h 02min de uso em 6 dias com dados
  E nesta semana já usei 6h
  Quando vejo o card
  Então leio "Quase igual à semana passada"

Cenário 6: Sem base de comparação
  Dado que a semana passada teve só 2 dias com dados de uso
  Quando vejo o card
  Então não aparece nenhuma comparação

Cenário 7: Apps somados por nome no detalhe do dia
  Dado que na quarta usei 15 min em cada um dos dois pacotes do TikTok e 20 min de Instagram
  Quando toco na pílula de quarta
  Então o bloco "NAS REDES" mostra "TikTok 30 min · Instagram 20 min"

Cenário 8: Intenções no detalhe do dia
  Dado que na quarta escrevi "responder a turma", "" e "ver o story da Bia" na pausa de intenção
  Quando toco na pílula de quarta
  Então vejo "O QUE VOCÊ ESCREVEU NA PAUSA"
  E vejo "“responder a turma” · “ver o story da Bia”"

Cenário 9: Dia sem dados de bloqueio
  Dado que na terça não abri nenhum app bloqueado e não há usoApps
  Quando toco na pílula de terça
  Então o detalhe do dia não mostra o bloco "NAS REDES"

Cenário 10: Reflexão aparece uma vez na segunda
  Dado que hoje é segunda-feira e tenho acesso de uso
  E a semana anterior tem 6 dias com dados de uso
  Quando abro a aba Progresso pela primeira vez na semana
  Então vejo a sheet "Sua semana nas redes"
  E quando fecho e abro a aba de novo ela não aparece

Cenário 11: Reflexão não aparece sem dados suficientes
  Dado que hoje é segunda-feira
  E a semana anterior tem só 3 dias com dados de uso
  Quando abro a aba Progresso
  Então a sheet de reflexão não aparece

Cenário 12: Reflexão sem proposta de desafio
  Dado que estou vendo a sheet "Sua semana nas redes"
  Então vejo o total, a média por dia, o dia mais longo e as aberturas
  E não vejo nenhuma proposta de desafio ou meta

Cenário 13: Analytics sem dado pessoal
  Dado que a reflexão da semana foi exibida
  Quando toco em "Entendi"
  Então o evento "reflexao_semanal_fechada" é registrado com acao "entendi"
  E nenhum evento contém tempo de uso, nome de app ou texto de intenção

Cenário 14: Nada muda no streak
  Dado que tenho streak de 12 dias
  Quando abro a aba Progresso e o detalhe de qualquer dia
  Então meu streak continua 12
  E nenhum documento do Firestore é alterado
```

## 6. Testes sugeridos (Jest + @testing-library/react-native)

Seguindo o CLAUDE.md: `describe('HU-08 · Tempo nas redes e reflexão da semana', ...)` e `it('Cenário N: ...')`.

- `domain/resumoRedes.ts` (prioridade): limites da semana (segunda a domingo, virada de mês), soma por app com pacotes agrupados, campos ausentes como zero, exclusão das chaves de horário, formatação de duração (RN05), comparação com os 3 textos e o limite de 4 dias (RN06), "mais da metade" vs. "o que mais ocupou" (RN10), intenções vazias filtradas e limite de 5 (RN09)
- `ResumoRedesCard`: variantes com e sem acesso de uso, comparação presente e ausente
- `DayDetailSheet`: bloco presente e ausente
- `ProgressoScreen`: reflexão abre uma vez por semana (AsyncStorage mockado) e não abre sem dados suficientes

## 7. Pendências

- **Proposta de redução como desafio** (bloco tracejado do protótipo 08.4): hoje os desafios são um catálogo fixo (`docs/projeto/spec.md`). Aceitar exige um novo tipo de desafio e possivelmente campo novo em `challenges`. Decidir antes de uma HU própria.
- **Dependência de dados:** a HU funciona sem dados, mas só faz sentido para o usuário com semanas reais de `usoApps`/`resumoBloqueio`. Construir depois de algumas semanas do teste fechado, como prevê o roadmap.
- **Protótipo 08.4 corrigido em 22/out:** a métrica "último uso, em média" foi trocada por "aberturas" para cumprir a RN14.
