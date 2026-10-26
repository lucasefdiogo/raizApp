# Tarefa do dia como alternativa na interceptação — design

Data: 2026-10-26

## Problema

Hoje a interceptação só oferece uma alternativa à rolagem durante a janela noturna (a
alternativa noturna cadastrada em Perfil → Rotina noturna). Durante o dia, a pessoa só espera a
contagem para liberar o app. Esta funcionalidade oferece, na própria pausa, uma das tarefas já
planejadas para hoje, para trocar a rolagem por algo da própria pessoa com um toque.

## Decisões de produto (dadas, não reabertas neste design)

- Aparece na pausa de intenção (`PausaIntencaoScreen`) e na espera do acesso rápido
  (`EsperaAcessoRapidoScreen`), fora da janela noturna. Nunca no cooldown, saldo zerado,
  emergência ou sessão ativa.
- Na janela noturna, só a alternativa noturna já existente vale — sem alternativa noturna
  cadastrada, nenhum botão aparece, mesmo com tarefa pendente.
- Tarefa escolhida: tarefas de hoje não concluídas, subtarefas incluídas. Essenciais pendentes
  primeiro, na ordem da Home; sem essencial pendente, comuns pendentes. Rotaciona pela posição da
  sessão no dia: `índice = (posição - 1) mod tamanho do grupo`, mesma posição do texto
  "{n}ª SESSÃO HOJE".
- Sem tarefa pendente: nenhum botão. Nunca sugestão genérica.
- Botão: mesmo componente e posição do botão da alternativa noturna. Texto "{título} em vez
  disso", título truncado em 32 caracteres no último espaço antes do limite + "…". Habilitado
  desde o início da contagem. Nunca usa Cobre.
- Toque: fecha a pausa sem liberar sessão, abre sessão de foco de 5 min com `tarefaId` e origem
  `'interceptacao'`. Não avança a posição da sessão no dia. No acesso rápido, cancela sem gastar a
  cota. Concluir a tarefa pela sessão segue as regras normais.
- Analytics: `intercept_shown` ganha o parâmetro `alternativa`
  (`'tarefa_essencial' | 'tarefa_comum' | 'noturna' | 'nenhuma'`). Evento novo
  `alternativa_escolhida` com `tipo` e `tela` (`'pausa' | 'acesso_rapido'`). Título da tarefa nunca
  vai para Analytics, logs ou notificações.
- Não muda: máquina de estados nativa, sessões, cooldown, cota do acesso rápido, `resumoBloqueio`,
  streak, `statusDia`.
- Tom: sem ponto de exclamação, sem imperativo de cobrança.

## Lacunas técnicas resolvidas no brainstorming

1. **Fonte dos dados** — em vez de uma leitura própria do cache do Firestore no `InterceptRoot`
   com timeout de 300 ms, reusa-se `tarefasParaExibir` que `InterceptScreen` já calcula (snapshot
   nativo via `salvarSnapshotDoDia`/SharedPreferences enquanto `useDailyTasks` carrega, lista viva
   depois). Já é o mesmo padrão usado pelas tarefas extras do cooldown e já nunca espera por
   definição — nenhuma leitura nova, nenhum timeout a implementar ou testar.
2. **`alternativa_noturna_escolhida`** — hoje dispara sem nenhum parâmetro. Sai do código; é
   substituído por `alternativa_escolhida({ tipo: 'noturna', tela })`.
3. **`logInterceptShown`** — existe e tem teste, mas nunca é chamado em nenhuma tela do app hoje
   (dessincronizado da seção 12 de `regras-de-negocio.md`, que já o documentava). Esta tarefa liga
   a chamada pela primeira vez, só nos dois wrappers que esta funcionalidade toca
   (`PausaIntencaoNoturna`, `EsperaAcessoRapidoNoturna|Screen`); cooldown e saldo zerado continuam
   sem disparar, por ser pré-existente e fora de escopo.
4. **`estadoTela`/`AcaoIntercept` fixos em `'B'`** — todo handler de saída sem liberar em
   `InterceptScreen` já grava `registrarAcao('B', 'saiu')`, incluindo o da alternativa noturna. O
   `'A'/'B'/'C'` de `EstadoTela` é, na verdade, do `selecionarTarefaIntercept` (feature do
   TravadoFlow/"O que está pegando agora", usada só por `HomeScreen`/`useTravadoFlow`) — não há
   distinção real de estado dentro de `InterceptScreen`. `logInterceptShown('B', ...)` segue o
   mesmo padrão.
5. **`registrarAcao` ao entrar numa sessão de foco** — `handleSessaoDeFoco` (válvula "Sessão de
   foco", já existente) nunca chama `registrarAcao` ao entrar numa sessão livre; só `liberar`
   (acao `'liberou'`) e as saídas sem liberar (acao `'saiu'`) chamam. `handleAlternativaDia` entra
   numa sessão (não sai da interceptação), então também não chama `registrarAcao` — mantém o
   mesmo padrão de `handleSessaoDeFoco`.
6. **Gate `noturna &&` nas telas-base** — hoje `PausaIntencaoScreen`/`EsperaAcessoRapidoScreen` só
   mostram o botão quando `mensagemNoturna` existe (`{noturna && alternativa && onAlternativa && (...)}`,
   onde `noturna = !!mensagemNoturna`). Isso bloquearia a alternativa do dia, que precisa aparecer
   sem mensagem noturna. A condição passa a ser só `alternativa && onAlternativa` — o wrapper já
   decide completamente quando preencher essas props; a tela-base não precisa mais saber se está
   na janela.

## Arquitetura

### `src/domain/alternativaDia.ts` (novo, puro, sem React/Firebase)

```ts
export type TipoAlternativaDia = 'tarefa_essencial' | 'tarefa_comum' | 'noturna' | 'nenhuma';

export function escolherTarefaAlternativa(
  tarefas: Tarefa[],
  posicaoSessao: number,
): Tarefa | null;

export function truncarTitulo(titulo: string, limite?: number): string; // limite default 32

export function calcularTipoAlternativa(
  janelaNoturna: boolean,
  alternativaNoturnaTexto: string | null,
  tarefaAlternativa: Tarefa | null,
): TipoAlternativaDia;
```

- `escolherTarefaAlternativa`: filtra `!concluida`; separa `essencial` de `!essencial` (subtarefas
  já nascem `essencial: false`, entram no grupo comum); grupo = essenciais se não vazio, senão
  comuns; vazio nos dois → `null`; `índice = (posicaoSessao - 1) % grupo.length` na ordem do array
  recebido (mesma ordem da Home, sem reordenar).
- `truncarTitulo`: `titulo.length <= limite` → retorna como está. Senão, último espaço dentro de
  `titulo.slice(0, limite)`; existe → corta ali + "…"; não existe (palavra única) → corta em
  `limite` caracteres + "…".
- `calcularTipoAlternativa`: `janelaNoturna` → `alternativaNoturnaTexto` truthy ? `'noturna'` :
  `'nenhuma'` (tarefa nunca conta na janela noturna). Fora da janela → `tarefaAlternativa` null ?
  `'nenhuma'` : `tarefaAlternativa.essencial` ? `'tarefa_essencial'` : `'tarefa_comum'`.

### Componentes — sem componente novo

`PausaIntencaoScreen` e `EsperaAcessoRapidoScreen` mantêm as props `alternativa?: string` /
`onAlternativa?: () => void` como já são hoje (texto genérico + callback), sem saber se é noturna
ou do dia.

### Wrappers decidem a origem da alternativa

`PausaIntencaoNoturna` e `EsperaAcessoRapidoNoturna` ganham novas props `tarefas: Tarefa[]` e
`onAlternativaDia: (tarefaId: string) => void`, além das que já têm. Com `noturna.noturna` true,
comportamento inalterado (alternativa/`onAlternativaNoturna` como hoje). Com `noturna.noturna`
false: `escolherTarefaAlternativa(tarefas, blocosUsados + 1)`; se achou tarefa, passam
`truncarTitulo(tarefa.titulo)` como `alternativa` e `() => onAlternativaDia(tarefa.id)` como
`onAlternativa`; se não achou, nenhuma das duas props (sem botão).

Os dois wrappers passam a chamar `logInterceptShown('B', noturna.noturna, tipoAlternativa)` uma
vez, depois que `noturna.carregando` resolve (mesmo ponto em que hoje decidem renderizar a tela em
vez do `LoadingIndicator`).

### `InterceptScreen`

- Novo estado `tarefaAlternativaId: string | null` (inicial `null`).
- `handleAlternativaDia(tarefaId: string, tela: 'pausa' | 'acesso_rapido')`: acha a tarefa em
  `tarefasParaExibir`, loga `alternativa_escolhida({ tipo, tela })`,
  `setTarefaAlternativaId(tarefaId)`, `setModo('sessao')`. Sem `registrarAcao` (item 5 das
  lacunas acima).
- `parametrosSessao` ganha um ramo antes de `sessaoLivre`: `tarefaAlternativaId` não nulo →
  `{ tarefaId: tarefaAlternativaId, estadoTravado: null, duracaoInicialSeg: DURACAO_SEG_SESSAO_BLOQUEIO }`.
- `handleFecharSessao` também `setTarefaAlternativaId(null)`.
- Passa `tarefas={tarefasParaExibir}` e `onAlternativaDia={id => handleAlternativaDia(id, 'pausa')}`
  para `PausaIntencaoNoturna`, e `onAlternativaDia={id => handleAlternativaDia(id, 'acesso_rapido')}`
  (mais `tarefas`) para `EsperaAcessoRapidoNoturna`. Nenhuma chamada a
  `liberar`/`liberarAcessoRapido` nesse caminho — a cota e o saldo não são tocados.

### Analytics (`src/services/analytics.ts` + `src/hooks/useAnalytics.ts`)

- Remove `logAlternativaNoturnaEscolhida`.
- Novo `logAlternativaEscolhida(tipo: TipoAlternativaDia | 'noturna', tela: 'pausa' | 'acesso_rapido')`
  → evento `alternativa_escolhida` com `{ tipo, tela }`.
- `logInterceptShown` ganha 3º parâmetro `alternativa: TipoAlternativaDia`.
- `handleAlternativaNoturna` (InterceptScreen) passa a chamar
  `logAlternativaEscolhida('noturna', tela)` em vez do evento antigo — `tela` determinada pelo
  `modo` atual (`'acessoRapido'` → `'acesso_rapido'`, senão `'pausa'`).

## Testes

`src/domain/alternativaDia.test.ts`: prioridade essencial → comum; concluídas fora; rotação por
posição (vários tamanhos de grupo, incluindo 1); lista vazia e só-concluídas → `null`; truncamento
normal; truncamento sem espaço antes do limite; `calcularTipoAlternativa` nos 4 casos (incluindo
janela noturna com tarefa pendente mas sem alternativa cadastrada → `'nenhuma'`).

Testes estendidos: `PausaIntencaoNoturna.test.tsx`, `EsperaAcessoRapidoNoturna.test.tsx` (ou
`EsperaAcessoRapidoScreen.test.tsx`, a conferir no plano) — botão mostra a tarefa certa fora da
janela, nenhum botão sem tarefa, janela noturna ignora tarefa pendente. `InterceptScreen.test.tsx`
— toque na alternativa do dia abre `SessaoFocoScreen` com o `tarefaId` certo sem chamar
`liberar`/`liberarAcessoRapido`, cota do acesso rápido intacta, `logAlternativaEscolhida` chamado
com `tipo`/`tela` certos, `logInterceptShown` chamado com `alternativa` certo.

## Documentação a atualizar no mesmo branch

`docs/projeto/regras-de-negocio.md`:
- Seção 7, subseção "Pausa de intenção": nova regra da alternativa do dia (onde aparece, escolha,
  rotação, truncamento).
- Seção 7, subseção "Válvulas de escape": nota de que a espera do acesso rápido também mostra a
  alternativa do dia fora da janela noturna.
- Seção 8, subseção "Efeito na interceptação": deixar explícito que a alternativa noturna
  continua tendo prioridade total sobre a do dia.
- Seção 12 (Privacidade e Analytics): atualizar `intercept_shown` com o parâmetro `alternativa`,
  trocar `alternativa_noturna_escolhida` por `alternativa_escolhida` (`tipo`, `tela`), reafirmar
  que o título da tarefa nunca é logado.

## Fora de escopo (não mexer)

- `logInterceptShown` em cooldown/saldo zerado (continua sem disparar).
- Qualquer reconciliação do `EstadoTela` A/B/C do TravadoFlow com este fluxo.
- Nativo (Kotlin), sessões, cooldown, cota, `resumoBloqueio`, streak, `statusDia`.
