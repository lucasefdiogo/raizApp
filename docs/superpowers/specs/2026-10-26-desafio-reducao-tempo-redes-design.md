# Desafio de redução de tempo nas redes — design

## Problema

O Progresso já mostra o tempo nas redes da semana (`ResumoRedesCard`) e, às segundas, abre uma
reflexão da semana anterior (`ReflexaoSemanalSheet`). A reflexão mostra os fatos e para aí: a
pessoa vê o número e não tem um próximo passo. A própria reflexão passa a propor uma meta pequena
para a semana, calculada a partir do uso real da pessoa, que ela aceita ou recusa com um toque.

## Decisões de produto (dadas, não reabertas)

### Proposta
- Aparece só dentro da `ReflexaoSemanalSheet`. Não existe outra forma de criar esse desafio, e a
  pessoa não digita a meta.
- Condições: a reflexão já precisa estar aparecendo (regras atuais dela); a semana anterior
  precisa somar pelo menos 1h nos apps bloqueados; não pode haver desafio de redução ativo; e a
  proposta desta semana ainda não pode ter sido respondida. Sem isso, a sheet fica exatamente
  como hoje.
- Base: o tempo dos apps bloqueados na semana anterior (segunda a domingo), com o mesmo filtro do
  card (só os apps de `regrasBloqueio.apps` vigentes). Com 7 dias de dados, a base é o total. Com
  4 a 6 dias, é a média dos dias com dado × 7. Dia sem `usoApps` não conta como zero.
- Meta: base × 0,9, arredondada para baixo ao múltiplo de 5 min. Ex.: base 6h 20min → meta
  5h 40min.
- Bloco na sheet: eyebrow "PROPOSTA PARA ESTA SEMANA", título "Até {meta} nas redes", linha
  "Cerca de {base − meta} a menos que a semana passada. Pequeno de propósito.". Botões "Aceitar"
  (`PrimaryButton`, o único Cobre da sheet) e "Agora não" (link). Duração no mesmo formato já
  usado no card. Quando a proposta aparece, esse bloco **substitui** o rodapé "Entendi"/"Agora
  não" atual — não convivem os dois pares de botão.
- "Agora não", fechar por gesto ou voltar físico contam como recusa: a proposta não volta nesta
  semana. Esses três caminhos já fecham a sheet hoje (via `onAgoraNao`); quando há proposta,
  passam também a disparar a recusa.
- Aceitar cria o desafio, fecha a sheet e mostra o toast "Combinado. Aparece no seu Progresso.".

### Dados
- Documento em `users/{uid}/challenges`: `titulo` "Até {meta} nas redes esta semana", `tipo`
  `'reducao_tempo_redes'`, `periodo` `'semanal'`, `dataInicio` (segunda atual), `dataFim`
  (domingo), `meta` e `progresso` em segundos, `status` `'ativo'`, mais `baseSegundos` (campo
  novo, opcional).
- Esse desafio NÃO substitui o semanal do catálogo. A regra "1 semanal + 1 mensal por vez" passa
  a valer só para os automáticos; o de redução é um terceiro, opcional.
- O progresso é sempre recalculado a partir de `dailyLogs.usoApps` da semana, com o filtro dos
  apps bloqueados vigentes. Nunca é incrementado.

### Andamento e resultado
- `ChallengeCard` ganha uma variante "teto" (menos é melhor): barra de consumo em Musgo,
  "{progresso} de {meta}" e "{n} dias restantes", onde n conta os dias depois de hoje até
  domingo (sábado: "1 dia restante"; domingo: "Último dia").
- Meta ultrapassada antes do fim: a barra fica cheia, sem mudar de cor, com a linha "Passou do
  combinado desta semana. Na segunda tem outra proposta.". O status continua `'ativo'` até
  domingo.
- Fechamento na primeira abertura depois de `dataFim`: `progresso <= meta` → `'concluido'`;
  senão → `'expirado'`. Se o anterior foi concluído, a reflexão seguinte mostra acima do título
  "Você fechou a semana passada dentro do combinado.". Se expirou, não diz nada sobre ele.
- Acesso de uso revogado no meio da semana: o progresso para no último valor, o card mostra "Sem
  medição desde {dia da semana}" e no fechamento o desafio vira `'expirado'`, sem texto de
  resultado.
- Consumo acima da meta nunca usa a cor de erro nem Cobre.

### Geral
- Analytics: `desafio_reducao_proposto`, `desafio_reducao_respondido` (`acao`: `'aceitou'` |
  `'agora_nao'`) e `desafio_reducao_fechado` (`resultado`: `'concluido'` | `'expirado'`). Nenhum
  evento leva tempo de uso, meta, base ou nome de app.
- Não muda: streak, proteção, `statusDia`, nem nada do bloqueio (sessões, cooldown, válvulas). O
  desafio só mede.
- Tom: sem ponto de exclamação, sem "melhorou/piorou", sem "falhou", sem comparação com outras
  pessoas.

## Lacuna técnica encontrada e resolvida

`useDesafios`/`calcularProgressoDesafio`/`buscarDesafiosAtivos` tratam todo documento `ativo` em
`challenges` como um pool único, sem filtrar por tipo. Se o desafio de redução ficasse `ativo`
nesse pool sem mais nada, dois problemas reais apareceriam: (1) `resolverDesafio` casa por
`periodo` + `dataInicio` apenas — o desafio de redução tem o mesmo `periodo: 'semanal'` e a mesma
`dataInicio` do semanal do catálogo, então poderia ser confundido com ele; (2) o loop de
fechamento do catálogo rodaria `calcularProgressoDesafio` nele, cujo `switch` não tem `case` para
`'reducao_tempo_redes'` nem `default` — quebra o TypeScript (`bruto` usado sem ser atribuído) ou,
se contornado, grava progresso incorreto.

Resolução: o desafio de redução fica fora desse pool. `useDesafios` ganha um filtro de uma linha
excluindo `tipo === 'reducao_tempo_redes'` da lista antes de usá-la — o catálogo nunca precisa
saber que esse terceiro desafio existe. Isso já bate com a decisão de produto ("é um terceiro,
opcional"; a regra 1+1 vale só para os automáticos).

## Arquitetura

- `src/domain/desafioReducao.ts` (novo): funções puras — elegibilidade, base (7 dias / 4-6 dias),
  meta (×0,9 arredondado para baixo em múltiplos de 5 min), progresso semanal (segundos, filtro
  `regrasBloqueio.apps`, teto ultrapassado, "sem medição desde"), fechamento (concluído/expirado),
  dias restantes, texto do resultado anterior. Reaproveita `somarSegundosBloqueados` e
  `formatarDuracao` (`domain/resumoRedes.ts`) e `inicioDaSemana`/`paraISOLocal`
  (`domain/streak.ts`/`domain/data.ts`).
- `src/domain/types.ts`: `Desafio.tipo` ganha o literal `'reducao_tempo_redes'` (união ampliada,
  não entra no `TipoDesafio` de 3 membros do catálogo) e `Desafio.baseSegundos?: number`.
- `src/services/firestore.ts`: reaproveita `documentoDesafio`/`criarDesafio`/
  `atualizarProgressoDesafio`; adiciona `buscarDesafio(uid, challengeId): Promise<Desafio | null>`
  (um único `getDoc` por id determinístico `${tipo}-${dataInicio}`, mesmo padrão do catálogo) —
  usado para ler o documento da semana anterior direto, sem depender de `status === 'ativo'`.
- `src/hooks/useDesafios.ts`: filtro de uma linha (comentado) excluindo
  `tipo === 'reducao_tempo_redes'` da lista de `ativos` antes do loop de fechamento e de
  `resolverDesafio`. Nada mais muda aqui.
- `src/hooks/useDesafioReducao.ts` (novo): usa `buscarDesafiosAtivos` (já existe, sem índice novo)
  filtrando client-side por `tipo === 'reducao_tempo_redes'` para achar um ativo e fechá-lo se
  `dataFim` já passou (fechamento preguiçoso, roda antes de avaliar elegibilidade); usa
  `buscarDesafio` com o id determinístico da semana anterior para saber o resultado (texto da
  reflexão); decide a proposta desta semana ou lê o documento já criado se aceita; expõe
  `proposta`, `desafioAtivo`, `resultadoAnteriorTexto`, `aceitar()`, `recusar()`.
- `src/components/progress/ReflexaoSemanalSheet.tsx`: ganha props `proposta`,
  `resultadoAnteriorTexto`, `onAceitarProposta` — fica burro, sem Firestore.
- `src/components/challenges/ChallengeCard.tsx`: ganha a variante "teto" (prop nova), sem tocar a
  variante atual.
- `src/screens/progress/ProgressoScreen.tsx`: conecta `useDesafioReducao`, estende
  `fecharReflexao`/`onAgoraNao` para também chamar `recusar()` quando há proposta visível, renderiza
  o `ChallengeCard` variante teto quando há desafio ativo.

## Elegibilidade, cálculo e fechamento

**Elegibilidade** (`elegivelParaProposta`), todas as condições precisam valer:
1. `reflexaoSemanal(...)` não nulo (gate que já existe).
2. `somarSegundosBloqueados(semana anterior, appsBloqueados) >= 3600`.
3. Nenhum desafio de redução `ativo` (depois do fechamento preguiçoso abaixo).
4. A proposta desta semana ainda não foi respondida.

**Fechamento preguiçoso** (roda no load de `useDesafioReducao`, antes de elegibilidade): busca
`buscarDesafiosAtivos`, filtra por `tipo === 'reducao_tempo_redes'`. Achando um com
`dataFim < hoje` (comparação de string ISO, mesmo padrão de `calcularProgressoDesafio`), fecha:
`progresso <= meta` → `'concluido'`, senão `'expirado'`, grava via `atualizarProgressoDesafio`.
Isso cobre qualquer desafio de redução esquecido, não só o da semana passada.

**"Já respondida esta semana":** aceitar cria o documento — a existência dele já responde para o
futuro. Recusar não cria nada, então usa uma chave nova no AsyncStorage (mesmo padrão de
`STORAGE_KEYS.reflexaoSemanalVista`), gravando a semana atual quando `recusar()` roda.

**Progresso durante a semana** (desafio `ativo`, `dataFim` ainda não passou): recalcula a cada
carregamento a partir de `dailyLogs.usoApps` da semana corrente, com o filtro de
`regrasBloqueio.apps`, só grava se mudou — mesmo padrão do catálogo.

**Acesso de uso revogado no meio da semana:** progresso para no último valor gravado; o card
mostra "Sem medição desde {dia da semana}" (o último dia com `usoApps` dentro da semana do
desafio). No fechamento, vira `'expirado'` incondicionalmente, sem texto de resultado.

## UI, analytics e documentação

- `ChallengeCard`, variante `'teto'` (prop nova, default `'piso'` preserva o comportamento
  atual): `progresso`/`meta` chegam em segundos, linha de contagem usa `formatarDuracao`; barra
  sempre Musgo, clampada em 100% (`Math.min(1, progresso/meta)` já existente); linha extra de
  dias restantes; mensagem condicional substituindo `MENSAGEM_STATUS` para "passou do combinado"
  ou "sem medição desde" — nenhuma usa Cobre nem cor de erro.
- Analytics em `services/analytics.ts`: `logDesafioReducaoProposto()`,
  `logDesafioReducaoRespondido(acao: 'aceitou' | 'agora_nao')`,
  `logDesafioReducaoFechado(resultado: 'concluido' | 'expirado')`. Nenhum leva tempo, meta, base
  ou nome de app.
- Debug/teste manual (`__DEV__`): segue o padrão já documentado em `debugFlags.ts` +
  `PerfilScreen` (device físico via WSL não alcança o Metro). Novo flag
  `MOSTRAR_SEMEAR_DESAFIO_REDUCAO`; dois links em `PerfilScreen` atrás de
  `__DEV__ || MOSTRAR_SEMEAR_DESAFIO_REDUCAO`:
  - "Semear semana passada → fecha concluído": grava `dailyLogs.usoApps` da semana anterior real
    (datas de verdade) com um total abaixo da meta calculada, e cria direto no Firestore um
    `challenges` de redução datado para essa mesma semana anterior, `status: 'ativo'`. Como
    `dataFim` já passou de verdade, o fechamento preguiçoso dispara na próxima abertura do
    Progresso — concluído.
  - "Semear semana passada → fecha expirado": igual, com total acima da meta.
  Função nova em `src/dev/semearDesafioReducao.ts`, só chamada a partir desses dois links — nunca
  importada fora de código `__DEV__`. A mesma semana seedada alimenta a proposta desta semana (a
  elegibilidade usa a mesma "semana anterior"), então o roteiro completo (proposta → aceitar →
  acompanhar o card → ultrapassar a meta → ver o resultado anterior na reflexão) sai de um único
  seed, sem esperar semana real nenhuma.
- Documentação: nova subseção "### Desafio de redução de tempo nas redes" na seção 4
  (`docs/projeto/regras-de-negocio.md`), com elegibilidade/base/meta/progresso/fechamento; a
  linha "Não propõe desafio nem meta." na subseção `ReflexaoSemanalSheet` (seção 5) fica
  obsoleta e é removida/ajustada; `docs/projeto/schema.md` ganha o campo `baseSegundos` e o novo
  valor de `tipo`.

## Testes (cobertura mínima)

Limite de 1h; desafio de redução já ativo; proposta já respondida nesta semana; base com 7 dias
de dado; base com 4–6 dias (média × 7); arredondamento para baixo ao múltiplo de 5 min; progresso
com o filtro dos apps vigentes; progresso igual à meta conclui; dados interrompidos (acesso
revogado); "dias restantes" de segunda a domingo (incluindo sábado e domingo); convivência com o
semanal do catálogo (o filtro em `useDesafios` não deixa o desafio de redução ser confundido nem
fechado pelo loop do catálogo).
