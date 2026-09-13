# Banco de Frases Motivacionais — Neutras (MVP)

> Todas de autoria própria para o produto, sem atribuição a terceiros e sem viés religioso.
> Tom de voz obrigatório: frases curtas, verbo no início quando possível, **sem ponto de exclamação**, sem culpa, sem cobrança.
> Cada tema está ancorado em uma seção da *Fundamentação Teórica*.

---

## Como usar

| Campo no Firestore | Valor |
|---|---|
| `texto` | a frase |
| `tema` | `disciplina` \| `foco` \| `recomeco` \| `identidade` \| `desconforto` \| `pequenos_passos` |
| `contexto` | `home` \| `pos_recaida` \| `retorno` \| `marco` (define onde pode aparecer) |
| `ativa` | boolean |

Regra de exibição: frases de tema `recomeco` e `desconforto` **nunca** aparecem em dia comum na Home — são reservadas para telas de recaída e retorno, onde o estado emocional do usuário é diferente.

---

## 1. Disciplina e ação
*Base teórica: seção 2 — procrastinação é evitação emocional, não falta de força de vontade.*

- "Motivação começa depois da ação, não antes dela."
- "Você não precisa querer fazer. Precisa só começar."
- "Disciplina é o que sobra quando a vontade vai embora."
- "Feito é melhor que perfeito."
- "Comece pela parte mais fácil. O resto vem junto."
- "Ação primeiro. A vontade costuma chegar atrasada."
- "Ninguém sente vontade todos os dias. Quem avança faz mesmo assim."
- "O plano não precisa ser bom. Precisa ser executado."

---

## 2. Foco e distração
*Base teórica: seções 4 e 6 — sistema de "querer" hipersensibilizado; rolagem infinita sem ponto natural de parada.*

- "A distração promete alívio e entrega vazio."
- "Querer abrir o app não é o mesmo que gostar de ter ficado nele."
- "Presença é uma escolha que se repete, não um estado permanente."
- "O feed não tem fim. Sua atenção tem."
- "Cada minuto de tela é um minuto emprestado do seu futuro."
- "Deixe o celular longe da mão. O resto fica mais fácil."
- "Não é falta de foco. É excesso de convite."
- "Atenção é o recurso mais disputado que você tem."

---

## 3. Recomeço e recaída
*Base teórica: seções 3 e 8 — a autocrítica pós-falha intensifica o ciclo; autocompaixão reduz o atrito da retomada.*

- "Recomeçar não é fraqueza. É a prova de que você não desistiu."
- "Todo processo de mudança tem dias ruins. Isso não é exceção, é regra."
- "Você não perdeu o progresso. Só pausou por um momento."
- "Falhar um dia é informação. Não é sentença."
- "O que você faz hoje pesa mais do que o que deixou de fazer ontem."
- "Um dia fora não apaga os dias que já foram."
- "Volte pequeno. Voltar é o que importa."
- "Se cobrar não funcionou até agora, tente recomeçar sem se cobrar."

---

## 4. Identidade e consistência
*Base teórica: seção 10.1 — autoeficácia se constrói por experiências de domínio acumuladas (Bandura).*

- "Pequenas ações repetidas constroem quem você está se tornando."
- "Você não precisa de motivação. Precisa de evidência de que consegue."
- "Consistência é mais poderosa que intensidade."
- "Cada tarefa cumprida é uma prova contra a sua própria dúvida."
- "Confiança não se decide. Se acumula."
- "Você está construindo um histórico. Ele conta a seu favor."
- "Raiz cresce por baixo antes de aparecer por fora."
- "O que se repete vira estrutura."

---

## 5. Desconforto e tolerância
*Base teórica: seção 9.2 — exposição e prevenção de resposta; sentir o desconforto sem suprimi-lo automaticamente.*

- "O desconforto do começo dura menos que o peso de adiar."
- "Sentir preguiça e agir mesmo assim é o treino inteiro."
- "A vontade de fugir passa. Espere ela passar."
- "Fique com o incômodo por dois minutos. Ele encolhe."
- "Não é para gostar. É para fazer."
- "Adiar não elimina o desconforto. Só empurra com juros."

---

## 6. Pequenos passos
*Base teórica: seções 2.1 e 10.3 — aversividade da tarefa é preditor central; fatiar até o ponto de aceitação.*

- "Divida até ficar pequeno demais para recusar."
- "Cinco minutos contam. Zero minuto não."
- "A primeira frase é mais importante que o texto inteiro."
- "Você não precisa terminar. Precisa abrir."
- "Meta de hoje: só o primeiro passo."
- "Grande demais para começar significa que ainda não está fatiado."
- "Abra o arquivo. Só isso, por enquanto."

---

## 7. Frases proibidas — o que nunca entra no banco

Estas violam os princípios do produto e não devem ser adicionadas mesmo que soem motivadoras:

| Padrão proibido | Por quê |
|---|---|
| "Sem desculpas" / "Pare de inventar desculpa" | Culpa; aumenta a aversividade da tarefa (seção 3) |
| "Enquanto você dorme, alguém está te ultrapassando" | Comparação social + medo de falhar — ativa preocupações perfeccionistas (seção 7) |
| "Se você quisesse mesmo, você faria" | Ataca a autoeficácia, principal preditor a ser protegido (seção 2.1) |
| "Sem dor, sem ganho" | Glorifica sofrimento; contradiz recaída sem vergonha |
| "Você é o único responsável pelo seu fracasso" | Punitivo; realimenta o ciclo culpa → evitação |
| Qualquer frase com ponto de exclamação | Quebra o tom de voz definido na identidade Raiz |
