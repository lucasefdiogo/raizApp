# Tarefa do dia como alternativa na interceptação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Oferecer, na pausa de intenção e na espera do acesso rápido (fora da janela noturna), um
botão com uma tarefa pendente de hoje como alternativa à rolagem — mesmo componente/posição do
botão da alternativa noturna, abrindo uma sessão de foco de 5 min com essa tarefa.

**Architecture:** Duas funções puras novas em `domain/` escolhem a tarefa e truncam o título; os
wrappers que já decidem o comportamento noturno (`PausaIntencaoNoturna`,
`EsperaAcessoRapidoNoturna`) passam a decidir também a alternativa do dia, repassando o mesmo par
de props `alternativa`/`onAlternativa` que as telas-base já aceitam. `InterceptScreen` ganha um
novo estado (`tarefaAlternativaId`) que alimenta o `SessaoFocoScreen` já existente.

**Tech Stack:** React Native (TypeScript), Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-10-26-alternativa-dia-interceptacao-design.md`

## Global Constraints

- Texto do botão exato: `"{título} em vez disso"` (já implementado nas telas-base, não muda).
- Truncamento em 32 caracteres, cortando no último espaço antes do limite, com "…"; sem espaço
  antes do limite, corta em 32 caracteres mesmo assim, com "…".
- `índice = (posicaoSessao - 1) % tamanho do grupo`, usando a mesma `posicaoSessao` do texto
  "{n}ª SESSÃO HOJE" (= `blocosUsados + 1`).
- Sessão aberta pela alternativa do dia: `duracaoInicialSeg = DURACAO_SEG_SESSAO_BLOQUEIO` (300),
  `origem: 'interceptacao'` (já fixo no JSX do `SessaoFocoScreen`).
- O botão nunca usa Cobre; nunca ponto de exclamação; nunca imperativo de cobrança.
- Título da tarefa nunca é logado em Analytics, logs ou notificações — só o `tipo` agregado.
- Eventos: `alternativa_escolhida({ tipo: 'tarefa_essencial' | 'tarefa_comum' | 'noturna', tela: 'pausa' | 'acesso_rapido' })`
  substitui `alternativa_noturna_escolhida` (removido). `intercept_shown` ganha o 3º parâmetro
  `alternativa: 'tarefa_essencial' | 'tarefa_comum' | 'noturna' | 'nenhuma'`.
- Não toca: nativo (Kotlin), sessões/cooldown/cota do acesso rápido, `resumoBloqueio`, streak,
  `statusDia`, `logInterceptShown` em cooldown/saldo zerado (continua sem disparar).

## Review Focus

- Grupo de alternativas com tamanho 1 (só uma tarefa pendente): `índice` precisa dar sempre 0 e
  nunca dividir por zero nem estourar — testado na Task 1.
- Janela noturna com tarefa pendente mas sem `alternativaNoturna` cadastrada: nenhum botão
  aparece (a tarefa do dia nunca entra como substituta) — testado na Task 1 (`calcularTipoAlternativa`)
  e na Task 4 (wrapper).
- A mesma tentativa de abrir o app (mesma `posicaoSessao`, mesma lista de tarefas) precisa
  escolher a mesma tarefa tanto na pausa de intenção quanto na espera do acesso rápido — testado
  na Task 6.
- Tocar na alternativa do dia nunca chama `saldo.liberar` nem `saldo.liberarAcessoRapido` (não
  gasta cota nem avança posição) — testado na Task 6.
- Truncamento no limite exato (32 caracteres, sem corte) e título de uma palavra só sem espaço
  antes do limite (corte duro) — testado na Task 1.

---

### Task 1: Domínio — escolha da tarefa, truncamento e tipo da alternativa

**Files:**
- Create: `src/domain/alternativaDia.ts`
- Test: `src/domain/alternativaDia.test.ts`

**Interfaces:**
- Consumes: `Tarefa` de `src/domain/types.ts` (`id`, `titulo`, `essencial`, `concluida`,
  `tarefaPaiId?`).
- Produces (usado pelas Tasks 2, 4, 5, 6):
  ```ts
  export type TipoAlternativaDia = 'tarefa_essencial' | 'tarefa_comum' | 'noturna' | 'nenhuma';
  export function escolherTarefaAlternativa(tarefas: Tarefa[], posicaoSessao: number): Tarefa | null;
  export function truncarTitulo(titulo: string, limite?: number): string; // limite default 32
  export function calcularTipoAlternativa(
    janelaNoturna: boolean,
    alternativaNoturnaTexto: string | null,
    tarefaAlternativa: Tarefa | null,
  ): TipoAlternativaDia;
  ```

- [ ] **Step 1: Write failing tests for `escolherTarefaAlternativa`**

```ts
const essencialPendente = (id: string): Tarefa => ({ id, titulo: id, essencial: true, concluida: false });
const comumPendente = (id: string): Tarefa => ({ id, titulo: id, essencial: false, concluida: false });

it('prioriza essenciais pendentes sobre comuns', () => {
  const tarefas = [comumPendente('c1'), essencialPendente('e1')];
  expect(escolherTarefaAlternativa(tarefas, 1)?.id).toBe('e1');
});

it('sem essencial pendente, usa as comuns pendentes (subtarefa incluída)', () => {
  const tarefas = [
    { id: 'e1', titulo: 'E', essencial: true, concluida: true },
    comumPendente('c1'),
    { id: 's1', titulo: 'S', essencial: false, concluida: false, tarefaPaiId: 'e1' },
  ];
  expect(escolherTarefaAlternativa(tarefas, 1)?.id).toBe('c1');
});

it('ignora concluídas nos dois grupos', () => {
  const tarefas = [
    { id: 'e1', titulo: 'E', essencial: true, concluida: true },
    { id: 'c1', titulo: 'C', essencial: false, concluida: true },
  ];
  expect(escolherTarefaAlternativa(tarefas, 1)).toBeNull();
});

it('lista vazia devolve null', () => {
  expect(escolherTarefaAlternativa([], 1)).toBeNull();
});

it('rotaciona pela posição da sessão dentro do grupo', () => {
  const tarefas = [essencialPendente('e1'), essencialPendente('e2'), essencialPendente('e3')];
  expect(escolherTarefaAlternativa(tarefas, 1)?.id).toBe('e1');
  expect(escolherTarefaAlternativa(tarefas, 2)?.id).toBe('e2');
  expect(escolherTarefaAlternativa(tarefas, 4)?.id).toBe('e1'); // (4-1) % 3 === 0
});

it('grupo de tamanho 1 sempre devolve a mesma tarefa, qualquer posição', () => {
  const tarefas = [essencialPendente('e1')];
  expect(escolherTarefaAlternativa(tarefas, 1)?.id).toBe('e1');
  expect(escolherTarefaAlternativa(tarefas, 7)?.id).toBe('e1');
});
```

- [ ] **Step 2: Run `npx jest src/domain/alternativaDia.test.ts` — expect FAIL (module not found)**

- [ ] **Step 3: Implement `escolherTarefaAlternativa` in `src/domain/alternativaDia.ts`**

Filtra `!concluida`; separa por `essencial`; grupo = essenciais se `length > 0`, senão comuns;
grupo vazio → `null`; senão `grupo[(posicaoSessao - 1) % grupo.length]`, preservando a ordem do
array recebido (mesma ordem da Home — não reordenar).

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Write failing tests for `truncarTitulo`**

```ts
it('título de até 32 caracteres não é cortado', () => {
  const titulo = 'a'.repeat(32);
  expect(truncarTitulo(titulo)).toBe(titulo);
});

it('corta no último espaço antes do limite, com "…"', () => {
  const titulo = 'Escrever uma frase sobre o dia de hoje';
  expect(truncarTitulo(titulo)).toBe('Escrever uma frase sobre o…');
});

it('sem espaço antes do limite, corta em 32 caracteres com "…"', () => {
  const titulo = 'a'.repeat(40);
  expect(truncarTitulo(titulo)).toBe('a'.repeat(32) + '…');
});
```

- [ ] **Step 6: Run tests — expect FAIL**

- [ ] **Step 7: Implement `truncarTitulo` in `src/domain/alternativaDia.ts`**

`titulo.length <= limite` → retorna como está. Senão, procura o último espaço em
`titulo.slice(0, limite)`; achou (índice > 0) → `titulo.slice(0, índice) + '…'`; não achou →
`titulo.slice(0, limite) + '…'`.

- [ ] **Step 8: Run tests — expect PASS**

- [ ] **Step 9: Write failing tests for `calcularTipoAlternativa`**

```ts
const TAREFA_ESSENCIAL: Tarefa = { id: 'e1', titulo: 'E', essencial: true, concluida: false };
const TAREFA_COMUM: Tarefa = { id: 'c1', titulo: 'C', essencial: false, concluida: false };

it('janela noturna com alternativa cadastrada: noturna, ignora a tarefa', () => {
  expect(calcularTipoAlternativa(true, 'Ler um pouco', TAREFA_ESSENCIAL)).toBe('noturna');
});

it('janela noturna sem alternativa cadastrada: nenhuma, mesmo com tarefa pendente', () => {
  expect(calcularTipoAlternativa(true, null, TAREFA_ESSENCIAL)).toBe('nenhuma');
});

it('fora da janela, tarefa essencial', () => {
  expect(calcularTipoAlternativa(false, null, TAREFA_ESSENCIAL)).toBe('tarefa_essencial');
});

it('fora da janela, tarefa comum', () => {
  expect(calcularTipoAlternativa(false, null, TAREFA_COMUM)).toBe('tarefa_comum');
});

it('fora da janela, sem tarefa: nenhuma', () => {
  expect(calcularTipoAlternativa(false, null, null)).toBe('nenhuma');
});
```

- [ ] **Step 10: Run tests — expect FAIL**

- [ ] **Step 11: Implement `calcularTipoAlternativa` in `src/domain/alternativaDia.ts`**

`janelaNoturna` → `alternativaNoturnaTexto ? 'noturna' : 'nenhuma'`. Senão → `tarefaAlternativa`
null ? `'nenhuma'` : `tarefaAlternativa.essencial ? 'tarefa_essencial' : 'tarefa_comum'`.

- [ ] **Step 12: Run `npx jest src/domain/alternativaDia.test.ts` — expect all PASS**

- [ ] **Step 13: Commit**

```bash
git add src/domain/alternativaDia.ts src/domain/alternativaDia.test.ts
git commit -m "feat: funcoes de dominio da alternativa do dia na interceptacao"
```

---

### Task 2: Analytics — `alternativa_escolhida` e `intercept_shown` com `alternativa`

**Files:**
- Modify: `src/services/analytics.ts`
- Modify: `src/hooks/useAnalytics.ts`
- Modify: `src/screens/intercept/InterceptScreen.tsx:94,104,113-116,193-198` (troca do evento noturno)
- Test: `src/services/analytics.test.ts`
- Test: `src/screens/intercept/InterceptScreen.test.tsx` (ajusta as asserções do evento noturno)

**Interfaces:**
- Consumes: `TipoAlternativaDia` (Task 1).
- Produces (usado pelas Tasks 4, 5, 6):
  ```ts
  // src/services/analytics.ts
  export function logAlternativaEscolhida(
    tipo: TipoAlternativaDia | 'noturna',
    tela: 'pausa' | 'acesso_rapido',
  ): void;
  export function logInterceptShown(
    estadoTela: EstadoTela,
    janelaNoturna: boolean,
    alternativa: TipoAlternativaDia,
  ): void; // assinatura estendida
  // logAlternativaNoturnaEscolhida removida
  ```
  `useAnalytics()` passa a expor `logAlternativaEscolhida` e `logInterceptShown` (não expõe
  `logAlternativaNoturnaEscolhida`).

- [ ] **Step 1: Update failing tests in `src/services/analytics.test.ts`**

Substitui o teste de `logAlternativaNoturnaEscolhida` (linha ~280) por:

```ts
it('logAlternativaEscolhida envia tipo e tela', () => {
  logAlternativaEscolhida('tarefa_essencial', 'pausa');

  expect(analyticsMock.logEvent).toHaveBeenCalledWith(
    expect.anything(),
    'alternativa_escolhida',
    { tipo: 'tarefa_essencial', tela: 'pausa' },
  );
});
```

Atualiza o teste de `logInterceptShown` (linha ~172):

```ts
it('logInterceptShown envia o estado da tela, a janela noturna e a alternativa', () => {
  logInterceptShown('A', true, 'noturna');

  expect(analyticsMock.logEvent).toHaveBeenCalledWith(
    expect.anything(),
    'intercept_shown',
    { estado_tela: 'A', janela_noturna: true, alternativa: 'noturna' },
  );
});
```

Remove o import de `logAlternativaNoturnaEscolhida`.

- [ ] **Step 2: Run `npx jest src/services/analytics.test.ts` — expect FAIL**

- [ ] **Step 3: Implement in `src/services/analytics.ts`**

Remove `logAlternativaNoturnaEscolhida`. Adiciona `logAlternativaEscolhida` (evento
`alternativa_escolhida`, params `{ tipo, tela }`). Estende `logInterceptShown` com o 3º parâmetro
`alternativa`, incluindo-o em `{ estado_tela, janela_noturna, alternativa }`.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Update `src/hooks/useAnalytics.ts`**

Troca o import/export de `logAlternativaNoturnaEscolhida` por `logAlternativaEscolhida`; adiciona
`logInterceptShown` à lista de imports e ao objeto devolvido pelo `useMemo`.

- [ ] **Step 6: Update `InterceptScreen.tsx`**

Linha 104-105: troca `logAlternativaNoturnaEscolhida` por `logAlternativaEscolhida` na
desestruturação de `useAnalytics()`. `handleAlternativaNoturna` (linha 193-198) passa a chamar
`logAlternativaEscolhida('noturna', tela)`, onde `tela = modo === 'acessoRapido' ? 'acesso_rapido' : 'pausa'`.

- [ ] **Step 7: Update `InterceptScreen.test.tsx`**

Nos dois testes da janela noturna que hoje verificam o evento antigo (procurar por
`logAlternativaNoturnaEscolhida` ou pelo mock de `useAnalytics`/`logValvulaEscolhida` já presente
no describe `janela noturna`), ajusta para verificar `logAlternativaEscolhida` com
`('noturna', 'pausa')` no teste CA-03 da pausa, e adiciona a mesma verificação com
`'acesso_rapido'` no fluxo de acesso rápido dentro da janela (procurar o describe de `acesso
rápido` combinado com janela noturna, se existir; senão, criar um teste novo mínimo nesse mesmo
describe).

- [ ] **Step 8: Run `npx jest src/screens/intercept/InterceptScreen.test.tsx src/services/analytics.test.ts` — expect PASS**

- [ ] **Step 9: Run `npx tsc --noEmit` — expect no new errors**

- [ ] **Step 10: Commit**

```bash
git add src/services/analytics.ts src/services/analytics.test.ts src/hooks/useAnalytics.ts src/screens/intercept/InterceptScreen.tsx src/screens/intercept/InterceptScreen.test.tsx
git commit -m "feat: evento alternativa_escolhida substitui alternativa_noturna_escolhida"
```

---

### Task 3: Telas-base — soltar o gate `noturna &&` do botão de alternativa

**Files:**
- Modify: `src/screens/intercept/PausaIntencaoScreen.tsx:82` (condição do botão)
- Modify: `src/screens/intercept/EsperaAcessoRapidoScreen.tsx:67` (condição do botão)
- Test: `src/screens/intercept/PausaIntencaoScreen.test.tsx:126-136`
- Test: `src/screens/intercept/EsperaAcessoRapidoScreen.test.tsx:95-99`

**Interfaces:**
- Consumes: nenhuma interface nova — `PausaIntencaoScreenProps`/`EsperaAcessoRapidoScreenProps`
  não mudam de forma (`alternativa?: string`, `onAlternativa?: () => void` já existem).
- Produces: nenhuma — telas-base continuam burras, decisão fica 100% em quem as chama (Tasks 4/5).

- [ ] **Step 1: Update failing test in `PausaIntencaoScreen.test.tsx`**

Substitui o teste `'sem mensagemNoturna a tela fica no modo padrão, mesmo com alternativa
informada'` (linha 132) por:

```ts
it('mostra o botão mesmo sem mensagemNoturna, quando alternativa e onAlternativa são informados', async () => {
  await montar({ alternativa: 'Ler um pouco', onAlternativa: jest.fn() });

  expect(screen.getByText('Ler um pouco em vez disso')).toBeTruthy();
});

it('sem alternativa informada o botão não aparece, mesmo com mensagemNoturna', async () => {
  await montar({ mensagemNoturna: 'Uma mensagem.' });

  expect(screen.queryByText(/em vez disso/)).toBeNull();
});
```

(O segundo teste já existe como `'sem alternativa o botão extra não aparece'`, linha 126 — manter
e só adicionar o primeiro.)

- [ ] **Step 2: Update failing test in `EsperaAcessoRapidoScreen.test.tsx`**

Substitui `'sem mensagemNoturna não mostra o botão de alternativa mesmo com alternativa
informada'` (linha 95) por:

```ts
it('mostra o botão mesmo sem mensagemNoturna, quando alternativa e onAlternativa são informados', async () => {
  await montar({ alternativa: 'Ler um pouco', onAlternativa: jest.fn() });

  expect(screen.getByText('Ler um pouco em vez disso')).toBeTruthy();
});
```

- [ ] **Step 3: Run `npx jest PausaIntencaoScreen.test.tsx EsperaAcessoRapidoScreen.test.tsx` — expect FAIL on the two new/changed assertions**

- [ ] **Step 4: Implement — `PausaIntencaoScreen.tsx:82`**

Troca `{noturna && alternativa && onAlternativa && (` por `{alternativa && onAlternativa && (`.
A variável local `noturna` continua usada no `eyebrow`/`headline` — não remover, só não usá-la
mais nessa condição.

- [ ] **Step 5: Implement — `EsperaAcessoRapidoScreen.tsx:67`**

Mesma troca: `{noturna && alternativa && onAlternativa && (` → `{alternativa && onAlternativa && (`.

- [ ] **Step 6: Run tests — expect PASS**

- [ ] **Step 7: Commit**

```bash
git add src/screens/intercept/PausaIntencaoScreen.tsx src/screens/intercept/PausaIntencaoScreen.test.tsx src/screens/intercept/EsperaAcessoRapidoScreen.tsx src/screens/intercept/EsperaAcessoRapidoScreen.test.tsx
git commit -m "fix: botao de alternativa nao depende mais de mensagem noturna"
```

---

### Task 4: `PausaIntencaoNoturna` — decide entre alternativa noturna e tarefa do dia

**Files:**
- Modify: `src/screens/rotina/PausaIntencaoNoturna.tsx`
- Test: `src/screens/rotina/PausaIntencaoNoturna.test.tsx`

**Interfaces:**
- Consumes: `escolherTarefaAlternativa`, `truncarTitulo`, `calcularTipoAlternativa` (Task 1);
  `useAnalytics().logInterceptShown` (Task 2); `Tarefa` (`domain/types`).
- Produces (usado pela Task 6):
  ```ts
  interface PausaIntencaoNoturnaProps {
    uid: string;
    appIconeBase64: string;
    appLabel: string;
    blocosUsados: number;
    duracaoBlocoMin: number;
    duracaoPadraoSeg: number;
    saldo: number | null;
    tarefas: Tarefa[]; // NOVO
    onLiberar: (intencao: string) => void;
    onAgoraNao: () => void;
    onAlternativaNoturna: () => void;
    onAlternativaDia: (tarefaId: string) => void; // NOVO
  }
  ```

- [ ] **Step 1: Write failing tests in `PausaIntencaoNoturna.test.tsx`**

Adiciona `tarefas: []` e `onAlternativaDia: jest.fn()` à função `montarPausa()` (ajustar a
assinatura pra aceitar overrides, no mesmo padrão de `EsperaAcessoRapidoNoturna.test.tsx`).

```ts
it('fora da janela, com essencial pendente, mostra o botão com o título da tarefa', async () => {
  jest.setSystemTime(new Date(2026, 9, 21, 14, 0, 0));
  await montarPausa({
    tarefas: [{ id: 't1', titulo: 'Abrir o material de estudo', essencial: true, concluida: false }],
  });
  await waitFor(() => expect(screen.queryByTestId('intercept-layout')).toBeTruthy());

  expect(screen.getByText('Abrir o material de estudo em vez disso')).toBeTruthy();
});

it('fora da janela, sem tarefa pendente, não mostra botão de alternativa', async () => {
  jest.setSystemTime(new Date(2026, 9, 21, 14, 0, 0));
  await montarPausa({ tarefas: [] });
  await waitFor(() => expect(screen.queryByTestId('intercept-layout')).toBeTruthy());

  expect(screen.queryByText(/em vez disso/)).toBeNull();
});

it('tocar na alternativa do dia chama onAlternativaDia com o id da tarefa', async () => {
  jest.setSystemTime(new Date(2026, 9, 21, 14, 0, 0));
  const onAlternativaDia = jest.fn();
  await montarPausa({
    tarefas: [{ id: 't1', titulo: 'Abrir o material', essencial: true, concluida: false }],
    onAlternativaDia,
  });
  await waitFor(() => expect(screen.queryByTestId('intercept-layout')).toBeTruthy());

  await fireEvent.press(screen.getByText('Abrir o material em vez disso'));

  expect(onAlternativaDia).toHaveBeenCalledWith('t1');
});

it('dentro da janela, com tarefa pendente mas sem alternativa noturna, não mostra botão', async () => {
  buscarUsuario.mockResolvedValue({ rotina: ROTINA }); // ROTINA sem alternativaNoturna
  await montarPausa({
    tarefas: [{ id: 't1', titulo: 'Abrir o material', essencial: true, concluida: false }],
  });
  await waitFor(() => expect(screen.queryByTestId('intercept-layout')).toBeTruthy());

  expect(screen.queryByText(/em vez disso/)).toBeNull();
});
```

(Importar `fireEvent` de `@testing-library/react-native` no topo do arquivo.)

- [ ] **Step 2: Run `npx jest PausaIntencaoNoturna.test.tsx` — expect FAIL**

- [ ] **Step 3: Implement in `PausaIntencaoNoturna.tsx`**

Adiciona `tarefas` e `onAlternativaDia` às props. Quando `!noturna.noturna`:
`const tarefaAlternativa = escolherTarefaAlternativa(tarefas, blocosUsados + 1)`. Monta
`alternativa`/`onAlternativa` repassados pro `PausaIntencaoScreen`:
- `noturna.noturna` → como já é hoje (`noturna.alternativa`, `onAlternativaNoturna`).
- senão, `tarefaAlternativa` presente → `truncarTitulo(tarefaAlternativa.titulo)` e
  `() => onAlternativaDia(tarefaAlternativa.id)`; ausente → `undefined`/`undefined`.

Com `useAnalytics()` (ou `useMemo`, seguindo o padrão do hook), adiciona um `useEffect` que, ao
`!noturna.carregando`, chama `logInterceptShown('B', noturna.noturna, calcularTipoAlternativa(noturna.noturna, noturna.alternativa, tarefaAlternativa))`
uma única vez (dispara no mesmo efeito que já existiria pra esse propósito — dependência
`[noturna.carregando]`, com `eslint-disable-next-line react-hooks/exhaustive-deps` como já é
convenção neste arquivo/vizinhos pra "dispara uma vez quando resolve").

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Run `npx tsc --noEmit` — expect no new errors**

- [ ] **Step 6: Commit**

```bash
git add src/screens/rotina/PausaIntencaoNoturna.tsx src/screens/rotina/PausaIntencaoNoturna.test.tsx
git commit -m "feat: PausaIntencaoNoturna oferece a tarefa do dia fora da janela"
```

---

### Task 5: `EsperaAcessoRapidoNoturna` — mesma decisão na espera do acesso rápido

**Files:**
- Modify: `src/screens/rotina/EsperaAcessoRapidoNoturna.tsx`
- Test: `src/screens/rotina/EsperaAcessoRapidoNoturna.test.tsx`

**Interfaces:**
- Consumes: idem Task 4.
- Produces (usado pela Task 6):
  ```ts
  interface EsperaAcessoRapidoNoturnaProps {
    uid: string;
    appIconeBase64: string;
    appLabel: string;
    blocosUsados: number;
    esperaSeg: number;
    tarefas: Tarefa[]; // NOVO
    onLiberado: () => void;
    onVoltarAoInicio: () => void;
    onAlternativa: () => void; // existente — mantém o nome (alternativa noturna)
    onAlternativaDia: (tarefaId: string) => void; // NOVO
  }
  ```

- [ ] **Step 1: Write failing tests in `EsperaAcessoRapidoNoturna.test.tsx`**

Mesmo padrão da Task 4, adaptado (a função `montar()` já aceita `sobrescritas`):

```ts
it('fora da janela, com essencial pendente, mostra o botão com o título da tarefa', async () => {
  jest.setSystemTime(new Date(2026, 9, 21, 14, 0, 0));
  await montar({
    tarefas: [{ id: 't1', titulo: 'Abrir o material', essencial: true, concluida: false }],
  });
  await waitFor(() => expect(screen.queryByTestId('intercept-layout')).toBeTruthy());

  expect(screen.getByText('Abrir o material em vez disso')).toBeTruthy();
});

it('tocar na alternativa do dia chama onAlternativaDia, não onLiberado', async () => {
  jest.setSystemTime(new Date(2026, 9, 21, 14, 0, 0));
  const onAlternativaDia = jest.fn();
  const { props } = await montar({
    tarefas: [{ id: 't1', titulo: 'Abrir o material', essencial: true, concluida: false }],
    onAlternativaDia,
  });
  await waitFor(() => expect(screen.queryByTestId('intercept-layout')).toBeTruthy());

  await fireEvent.press(screen.getByText('Abrir o material em vez disso'));

  expect(onAlternativaDia).toHaveBeenCalledWith('t1');
  expect(props.onLiberado).not.toHaveBeenCalled();
});
```

(A função `montar()` já devolve `{ props, ... }` — conferir se devolve `props` como no arquivo
atual; se não, ajustar pra devolver, seguindo o padrão já usado em `EsperaAcessoRapidoScreen.test.tsx`.)

- [ ] **Step 2: Run `npx jest EsperaAcessoRapidoNoturna.test.tsx` — expect FAIL**

- [ ] **Step 3: Implement in `EsperaAcessoRapidoNoturna.tsx`**

Mesma lógica da Task 4: `tarefas`/`onAlternativaDia` nas props; `escolherTarefaAlternativa(tarefas,
blocosUsados + 1)` quando `!noturna.noturna`; `alternativa`/`onAlternativa` repassados pro
`EsperaAcessoRapidoScreen` seguindo a mesma prioridade noite > dia > nenhum; `useEffect` com
`logInterceptShown('B', noturna.noturna, tipo)` ao resolver.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Run `npx tsc --noEmit` — expect no new errors**

- [ ] **Step 6: Commit**

```bash
git add src/screens/rotina/EsperaAcessoRapidoNoturna.tsx src/screens/rotina/EsperaAcessoRapidoNoturna.test.tsx
git commit -m "feat: EsperaAcessoRapidoNoturna oferece a tarefa do dia fora da janela"
```

---

### Task 6: `InterceptScreen` — abrir a sessão de foco com a tarefa escolhida

**Files:**
- Modify: `src/screens/intercept/InterceptScreen.tsx`
- Test: `src/screens/intercept/InterceptScreen.test.tsx`

**Interfaces:**
- Consumes: `PausaIntencaoNoturnaProps`/`EsperaAcessoRapidoNoturnaProps` novas (Tasks 4, 5);
  `logAlternativaEscolhida` (Task 2); `DURACAO_SEG_SESSAO_BLOQUEIO` (já importado de
  `domain/intercept`).
- Produces: nenhuma interface nova exposta a outros arquivos — `InterceptScreenProps` não muda.

- [ ] **Step 1: Write failing tests in `InterceptScreen.test.tsx`**

Dentro de `describe('AGUARDANDO_LIBERACAO (pausa de intenção)')` (ou um novo describe
`'alternativa do dia'` logo depois), com `configurarPausaNoturna()` (fora da janela, default) e
`configurarDailyTasks({ tarefas: [TAREFA_ESSENCIAL_PENDENTE] })`:

```ts
it('a alternativa do dia abre a SessaoFocoScreen com a tarefa, sem liberar nem avançar o saldo', async () => {
  const saldo = configurarSaldo({ fase: 'AGUARDANDO_LIBERACAO', saldo: 4, blocosUsados: 0 });
  configurarDailyTasks({ tarefas: [TAREFA_ESSENCIAL_PENDENTE] });
  await render(<InterceptScreen {...props} />);

  await fireEvent.press(
    screen.getByText(`${TAREFA_ESSENCIAL_PENDENTE.titulo} em vez disso`),
  );

  const mock = JSON.parse(screen.getByTestId('sessao-foco-mock').props.children);
  expect(mock).toMatchObject({
    tarefaId: TAREFA_ESSENCIAL_PENDENTE.id,
    duracaoInicialSeg: 300,
    origem: 'interceptacao',
  });
  expect(saldo.liberar).not.toHaveBeenCalled();
});

it('a alternativa do dia no acesso rápido não gasta a cota', async () => {
  configurarDailyTasks({ tarefas: [TAREFA_ESSENCIAL_PENDENTE] });
  const saldo = configurarSaldo({
    fase: 'COOLDOWN',
    fimCooldownEm: AGORA + 60_000,
  }, { acessoRapidoDisponivel: true });
  await render(<InterceptScreen {...props} />);
  await fireEvent.press(screen.getByRole('button', { name: /Acesso rápido/ }));

  await fireEvent.press(
    screen.getByText(`${TAREFA_ESSENCIAL_PENDENTE.titulo} em vez disso`),
  );

  const mock = JSON.parse(screen.getByTestId('sessao-foco-mock').props.children);
  expect(mock.tarefaId).toBe(TAREFA_ESSENCIAL_PENDENTE.id);
  expect(saldo.liberarAcessoRapido).not.toHaveBeenCalled();
});

it('pausa e espera do acesso rápido escolhem a mesma tarefa pra mesma posição de sessão', async () => {
  const tarefas = [TAREFA_ESSENCIAL_PENDENTE, { id: 'e2', titulo: 'Segunda', essencial: true, concluida: false }];
  configurarDailyTasks({ tarefas });
  configurarSaldo({ fase: 'AGUARDANDO_LIBERACAO', saldo: 4, blocosUsados: 1 });
  const primeira = await render(<InterceptScreen {...props} />);
  const textoNaPausa = tarefas.find(t => screen.queryByText(`${t.titulo} em vez disso`))?.titulo;
  expect(textoNaPausa).toBeTruthy();
  await primeira.unmount();

  configurarSaldo({}, { acessoRapidoDisponivel: true, dentroJanelaNoturna: false }, {});
  // (reconfigura saldo pra entrar no modo acesso rápido com o mesmo blocosUsados)
  await render(<InterceptScreen {...props} />);
  await fireEvent.press(screen.getByRole('button', { name: /Acesso rápido/ }));
  expect(screen.getByText(`${textoNaPausa} em vez disso`)).toBeTruthy();
});
```

(Ajustar os dois últimos testes às asserções exatas de como `acessoRapidoDisponivel` e as
válvulas aparecem nesta suíte — conferir o describe `'acesso rápido e emergência (HU-05)'`,
linha ~482, pra copiar o setup exato que já abre o modo `acessoRapido`.)

- [ ] **Step 2: Run `npx jest InterceptScreen.test.tsx` — expect FAIL**

- [ ] **Step 3: Implement in `InterceptScreen.tsx`**

- Novo estado: `const [tarefaAlternativaId, setTarefaAlternativaId] = useState<string | null>(null);`
- Novo handler:
  ```ts
  function handleAlternativaDia(tarefaId: string, tela: 'pausa' | 'acesso_rapido') {
    const tarefa = tarefasParaExibir.find(item => item.id === tarefaId);
    logAlternativaEscolhida(tarefa?.essencial ? 'tarefa_essencial' : 'tarefa_comum', tela);
    setTarefaAlternativaId(tarefaId);
    setModo('sessao');
  }
  ```
  (sem `registrarAcao` — ver Global Constraints / spec item 5.)
- `parametrosSessao`: novo primeiro ramo, antes de `sessaoLivre`:
  `tarefaAlternativaId ? { tarefaId: tarefaAlternativaId, estadoTravado: null, duracaoInicialSeg: DURACAO_SEG_SESSAO_BLOQUEIO } : sessaoLivre ? ... : ...`.
- `handleFecharSessao`: adiciona `setTarefaAlternativaId(null)`.
- No JSX de `PausaIntencaoNoturna`: adiciona `tarefas={tarefasParaExibir}` e
  `onAlternativaDia={id => handleAlternativaDia(id, 'pausa')}`.
- No JSX de `EsperaAcessoRapidoNoturna` (dentro do `modo === 'acessoRapido'`): adiciona
  `tarefas={tarefasParaExibir}` e `onAlternativaDia={id => handleAlternativaDia(id, 'acesso_rapido')}`.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Run full suite — `npm test`, `npx tsc --noEmit`, `npm run lint` — expect no new failures**

- [ ] **Step 6: Commit**

```bash
git add src/screens/intercept/InterceptScreen.tsx src/screens/intercept/InterceptScreen.test.tsx
git commit -m "feat: interceptacao abre sessao de foco com a tarefa escolhida como alternativa"
```

---

### Task 7: Documentação — `regras-de-negocio.md`

**Files:**
- Modify: `docs/projeto/regras-de-negocio.md` (seções 7, 8, 12)

**Interfaces:** nenhuma — só prosa.

- [ ] **Step 1: Seção 7, subseção "Pausa de intenção"** — acrescenta um item descrevendo a
  alternativa do dia: onde aparece (fora da janela, pausa e espera do acesso rápido), prioridade
  essencial → comum na ordem da Home, rotação por posição da sessão, truncamento em 32
  caracteres, nunca sugestão genérica.

- [ ] **Step 2: Seção 7, subseção "Válvulas de escape"** — acrescenta uma linha na descrição da
  `EsperaAcessoRapidoScreen` citando que, fora da janela noturna, ela também pode mostrar a
  alternativa do dia, cancelando sem gastar a cota.

- [ ] **Step 3: Seção 8, subseção "Efeito na interceptação"** — deixa explícito que, dentro da
  janela, só a alternativa noturna vale; sem `alternativaNoturna` cadastrada, nenhum botão
  aparece, mesmo com tarefa pendente.

- [ ] **Step 4: Seção 12 (Privacidade e Analytics)** — atualiza a entrada de `intercept_shown`
  com o parâmetro `alternativa`; troca `alternativa_noturna_escolhida` por `alternativa_escolhida`
  (`tipo`, `tela`); reafirma que o título da tarefa nunca é logado.

- [ ] **Step 5: Commit**

```bash
git add docs/projeto/regras-de-negocio.md
git commit -m "docs: regras da alternativa do dia na interceptacao"
```

---

### Task 8: Verificação final da branch

**Files:** nenhum (só comandos).

- [ ] **Step 1:** `npm test` — todos os testes passam, nenhuma regressão.
- [ ] **Step 2:** `npm run lint` — sem erros novos.
- [ ] **Step 3:** `npx tsc --noEmit` — sem erros novos.
- [ ] **Step 4:** Confirmar que `docs/projeto/regras-de-negocio.md` foi atualizado no mesmo
  branch (Task 7) antes do merge, por `superpowers:finishing-a-development-branch`.
