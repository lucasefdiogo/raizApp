# Desafio de redução de tempo nas redes — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A reflexão semanal propõe uma meta pequena de redução de tempo nas redes, calculada do
uso real da semana anterior; a pessoa aceita (cria um desafio de redução, acompanhado num
`ChallengeCard` próprio) ou recusa com um toque.

**Architecture:** Funções puras em `domain/desafioReducao.ts` (elegibilidade, base, meta,
progresso, fechamento) alimentam um hook novo (`useDesafioReducao`) que orquestra Firestore +
AsyncStorage, inteiramente isolado de `useDesafios`/`calcularProgressoDesafio` (que seguem só
cuidando do catálogo automático). `ReflexaoSemanalSheet` e `ChallengeCard` ganham props novas,
continuam burros. `ProgressoScreen` conecta tudo.

**Tech Stack:** React Native CLI + TypeScript, Firebase Firestore (client), Jest +
@testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-10-26-desafio-reducao-tempo-redes-design.md`

## Global Constraints

- Desafio de redução nunca entra no pool de `buscarDesafiosAtivos` consumido por `useDesafios` —
  filtrado antes de qualquer uso (`tipo !== 'reducao_tempo_redes'`).
- Progresso sempre recalculado de `dailyLogs.usoApps`, nunca incrementado.
- Nenhum evento de Analytics leva tempo de uso, meta, base ou nome de app.
- Consumo acima da meta nunca usa cor de erro nem Cobre; barra sempre Musgo.
- Tom: sem "!", sem "melhorou/piorou", sem "falhou", sem comparação com outras pessoas.
- Ferramenta de semeadura (`src/dev/semearDesafioReducao.ts`) só é chamada atrás de
  `__DEV__ || MOSTRAR_SEMEAR_DESAFIO_REDUCAO` — nunca entra no build de release.
- `Desafio.tipo` ganha o literal `'reducao_tempo_redes'` fora do `TipoDesafio` de 3 membros do
  catálogo; `calcularProgressoDesafio` (catálogo) nunca recebe um desafio desse tipo.

## Review Focus

- Semana com exatamente 4 dias de `usoApps` (limite inferior da base por média) — a base não
  pode virar `NaN` ou tratar o 4º dia como se fosse 7.
- Base exatamente em 3600s (1h) — "pelo menos 1h" é limite inclusivo, não estrito.
- Meta cujo ×0,9 cai exatamente num múltiplo de 5 min — não deve arredondar para o múltiplo
  abaixo por erro de ponto flutuante (ex.: `20520 * 0.9` não pode virar `18467.999...`).
- Um desafio de redução de uma semana esquecida (duas ou mais semanas atrás, nunca fechado)
  ainda `ativo` — o fechamento preguiçoso precisa achá-lo e fechá-lo, não só o da semana
  imediatamente anterior.
- Sábado e domingo em `diasRestantes`/`textoDiasRestantes` — são os dois casos de texto especial
  ("1 dia restante", "Último dia") e fáceis de inverter.

---

## Task 1: `desafioReducao.ts` — base e meta da proposta

**Files:**
- Create: `src/domain/desafioReducao.ts`
- Test: `src/domain/desafioReducao.test.ts`

**Interfaces:**
- Consumes: `somarSegundosBloqueados`, `diasComUsoApps`, `formatarDuracao` (todas já exportadas
  de `src/domain/resumoRedes.ts`); `LogComUso` (tipo interno de `resumoRedes.ts` — repita a forma
  `{ usoApps?: UsoApps }` aqui, sem importar um tipo não exportado).
- Produces: `calcularBaseSegundos(logsSemanaAnterior: Array<{ usoApps?: UsoApps }>, appsBloqueados: string[]): number`,
  `atingeMinimoParaProposta(baseSegundos: number): boolean`,
  `calcularMetaSegundos(baseSegundos: number): number`,
  `interface PropostaDesafioReducao { titulo: string; linha: string; metaSegundos: number; baseSegundos: number }`,
  `montarProposta(baseSegundos: number): PropostaDesafioReducao` — todos usados pela Task 5.

- [ ] **Step 1: Escrever os testes de `calcularBaseSegundos`**

```typescript
import { calcularBaseSegundos, atingeMinimoParaProposta, calcularMetaSegundos, montarProposta } from './desafioReducao';

const APPS = ['com.instagram.android'];

function logComUso(data: string, segundos: number) {
  return { data, usoApps: { 'com.instagram.android': { segundos, aberturas: 1 } } };
}

describe('calcularBaseSegundos', () => {
  it('com 7 dias de dado, a base é o total da semana', () => {
    const logs = Array.from({ length: 7 }, (_, i) => logComUso(`2026-10-0${i + 1}`, 3600));
    expect(calcularBaseSegundos(logs, APPS)).toBe(7 * 3600);
  });

  it('com 4 a 6 dias de dado, a base é a média dos dias com dado × 7', () => {
    const logs = [
      logComUso('2026-10-01', 3600),
      logComUso('2026-10-02', 3600),
      logComUso('2026-10-03', 3600),
      logComUso('2026-10-04', 3600),
    ];
    expect(calcularBaseSegundos(logs, APPS)).toBe(Math.round((4 * 3600 / 4) * 7));
  });

  it('dia sem usoApps não conta como zero na média', () => {
    const logs = [
      logComUso('2026-10-01', 7200),
      logComUso('2026-10-02', 7200),
      logComUso('2026-10-03', 7200),
      logComUso('2026-10-04', 7200),
      { data: '2026-10-05' },
    ];
    // 4 dias com dado, não 5 — média continua 7200, não 5760.
    expect(calcularBaseSegundos(logs, APPS)).toBe(Math.round((4 * 7200 / 4) * 7));
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx jest src/domain/desafioReducao.test.ts`
Expected: FAIL — `Cannot find module './desafioReducao'`.

- [ ] **Step 3: Implementar `calcularBaseSegundos` em `src/domain/desafioReducao.ts`**

Some soma com `somarSegundosBloqueados` (importada de `resumoRedes.ts`), conta dias com dado via
`diasComUsoApps` (idem). 7 dias → retorna o total. 4-6 dias → `Math.round((total / dias) * 7)`.
Repita localmente a interface mínima `interface LogComUso { usoApps?: UsoApps }` (não exportada
de `resumoRedes.ts` — defina a própria aqui, do mesmo jeito que esse arquivo já define a sua).

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx jest src/domain/desafioReducao.test.ts`
Expected: PASS 3/3.

- [ ] **Step 5: Escrever os testes de `atingeMinimoParaProposta` e `calcularMetaSegundos`, rodar RED, implementar, rodar GREEN**

```typescript
describe('atingeMinimoParaProposta', () => {
  it('abaixo de 1h não atinge', () => expect(atingeMinimoParaProposta(3599)).toBe(false));
  it('exatamente 1h atinge (limite inclusivo)', () => expect(atingeMinimoParaProposta(3600)).toBe(true));
  it('acima de 1h atinge', () => expect(atingeMinimoParaProposta(7200)).toBe(true));
});

describe('calcularMetaSegundos', () => {
  it('base 6h 20min (22800s) vira meta 5h 40min (20400s) — ×0,9 arredondado pra baixo ao múltiplo de 5min', () => {
    expect(calcularMetaSegundos(22800)).toBe(20400);
  });
  it('não sofre erro de ponto flutuante quando ×0,9 cai exatamente num múltiplo de 5min', () => {
    // 22800 * 0.9 = 20520, não é múltiplo de 300 — usa um caso que É:
    // base 20000s * 0.9 = 18000s, que já é múltiplo de 300.
    expect(calcularMetaSegundos(20000)).toBe(18000);
  });
});
```

`calcularMetaSegundos`: `Math.floor((baseSegundos * 0.9) / 300) * 300` — usar `Math.round` antes
do `/300` pra absorver erro de ponto flutuante do `* 0.9` (ex.: `Math.floor(Math.round(baseSegundos * 0.9) / 300) * 300`).

Run: `npx jest src/domain/desafioReducao.test.ts`
Expected: FAIL (funções não existem) → implementar → PASS 8/8.

- [ ] **Step 6: Escrever o teste de `montarProposta`, rodar RED, implementar, rodar GREEN**

```typescript
describe('montarProposta', () => {
  it('monta título e linha de comparação a partir da base', () => {
    const proposta = montarProposta(22800); // 6h20min -> meta 5h40min, delta 40min
    expect(proposta).toEqual({
      titulo: 'Até 5h 40min nas redes',
      linha: 'Cerca de 40 min a menos que a semana passada. Pequeno de propósito.',
      metaSegundos: 20400,
      baseSegundos: 22800,
    });
  });
});
```

`montarProposta` usa `calcularMetaSegundos` e `formatarDuracao` (de `resumoRedes.ts`) pra montar
as duas strings.

Run: `npx jest src/domain/desafioReducao.test.ts`
Expected: FAIL → implementar → PASS 9/9.

- [ ] **Step 7: Commit**

```bash
git add src/domain/desafioReducao.ts src/domain/desafioReducao.test.ts
git commit -m "feat: calcula base, meta e proposta do desafio de redução de tempo nas redes"
```

---

## Task 2: `desafioReducao.ts` — progresso, fechamento e dias restantes

**Files:**
- Modify: `src/domain/desafioReducao.ts`, `src/domain/types.ts`
- Test: `src/domain/desafioReducao.test.ts`

**Interfaces:**
- Consumes: `Desafio`, `StatusDesafio` (`domain/types.ts`); `somarSegundosBloqueados`,
  `diasComUsoApps` (`domain/resumoRedes.ts`); `paraISOLocal`, `dataLocalDeISO`
  (`domain/data.ts`).
- Produces: `interface ProgressoReducao { progressoSegundos: number; ultrapassou: boolean; semMedicaoDesde: string | null }`,
  `calcularProgressoReducao(desafio: Desafio, logsSemana: Array<{ data: string; usoApps?: UsoApps }>, appsBloqueados: string[], comAcessoDeUso: boolean): ProgressoReducao`,
  `statusAoFechar(progressoSegundos: number, metaSegundos: number): StatusDesafio`,
  `diasRestantes(hoje: Date, dataFim: string): number`,
  `textoDiasRestantes(dias: number): string`,
  `textoResultadoAnterior(desafioAnterior: Desafio | null): string | null` — todas usadas pela
  Task 5 (hook) e Task 7/8 (UI).

- [ ] **Step 1: Ampliar `Desafio.tipo` e `baseSegundos` em `src/domain/types.ts`**

```typescript
export interface Desafio {
  id: string;
  titulo: string;
  tipo: TipoDesafio | 'reducao_tempo_redes';
  periodo: PeriodoDesafio;
  dataInicio: string;
  dataFim: string;
  meta: number;
  progresso: number;
  status: StatusDesafio;
  /** Só no desafio de redução (RN do domain/desafioReducao.ts) — base em segundos da semana anterior. */
  baseSegundos?: number;
}
```

- [ ] **Step 2: Escrever os testes de `calcularProgressoReducao`**

```typescript
const DESAFIO_ATIVO = {
  id: 'reducao_tempo_redes-2026-10-19', titulo: 'Até 5h 40min nas redes esta semana',
  tipo: 'reducao_tempo_redes' as const, periodo: 'semanal' as const,
  dataInicio: '2026-10-19', dataFim: '2026-10-25',
  meta: 20400, progresso: 0, status: 'ativo' as const, baseSegundos: 22800,
};

describe('calcularProgressoReducao', () => {
  it('soma os segundos da semana filtrados pelos apps bloqueados', () => {
    const logs = [
      { data: '2026-10-19', usoApps: { 'com.instagram.android': { segundos: 3600, aberturas: 1 } } },
      { data: '2026-10-20', usoApps: { 'com.instagram.android': { segundos: 1800, aberturas: 1 } } },
    ];
    const resultado = calcularProgressoReducao(DESAFIO_ATIVO, logs, ['com.instagram.android'], true);
    expect(resultado).toEqual({ progressoSegundos: 5400, ultrapassou: false, semMedicaoDesde: null });
  });

  it('marca ultrapassou quando o progresso já passa da meta, sem travar em 100%', () => {
    const logs = [{ data: '2026-10-19', usoApps: { 'com.instagram.android': { segundos: 25000, aberturas: 1 } } }];
    const resultado = calcularProgressoReducao(DESAFIO_ATIVO, logs, ['com.instagram.android'], true);
    expect(resultado.progressoSegundos).toBe(25000);
    expect(resultado.ultrapassou).toBe(true);
  });

  it('progresso igual à meta não conta como ultrapassou', () => {
    const logs = [{ data: '2026-10-19', usoApps: { 'com.instagram.android': { segundos: 20400, aberturas: 1 } } }];
    const resultado = calcularProgressoReducao(DESAFIO_ATIVO, logs, ['com.instagram.android'], true);
    expect(resultado.ultrapassou).toBe(false);
  });

  it('sem acesso de uso, o progresso congela no último valor gravado e aponta o último dia medido', () => {
    const logs = [
      { data: '2026-10-19', usoApps: { 'com.instagram.android': { segundos: 3600, aberturas: 1 } } },
      { data: '2026-10-20' },
    ];
    const desafioComProgresso = { ...DESAFIO_ATIVO, progresso: 3600 };
    const resultado = calcularProgressoReducao(desafioComProgresso, logs, ['com.instagram.android'], false);
    expect(resultado).toEqual({ progressoSegundos: 3600, ultrapassou: false, semMedicaoDesde: 'segunda-feira' });
  });
});
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `npx jest src/domain/desafioReducao.test.ts`
Expected: FAIL — `calcularProgressoReducao` não definida.

- [ ] **Step 4: Implementar `calcularProgressoReducao`**

Com `comAcessoDeUso`: soma `somarSegundosBloqueados(logsSemana, appsBloqueados)`,
`ultrapassou = progressoSegundos > desafio.meta`, `semMedicaoDesde: null`. Sem
`comAcessoDeUso`: `progressoSegundos = desafio.progresso` (congelado), `ultrapassou` recalculado
sobre esse valor congelado, `semMedicaoDesde` = nome completo (lowercase) do dia da semana do
último log em `logsSemana` com `usoApps !== undefined`, ou `null` se nenhum. Defina localmente um
array `const DIA_SEMANA_COMPLETO = ['domingo', 'segunda-feira', ..., 'sábado']` indexado por
`dataLocalDeISO(data).getDay()` (0 = domingo), mesma convenção de `resumoRedes.ts`.

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx jest src/domain/desafioReducao.test.ts`
Expected: PASS.

- [ ] **Step 6: Escrever os testes de `statusAoFechar`, `diasRestantes`, `textoDiasRestantes` e `textoResultadoAnterior`**

```typescript
describe('statusAoFechar', () => {
  it('progresso dentro da meta conclui', () => expect(statusAoFechar(20000, 20400)).toBe('concluido'));
  it('progresso igual à meta conclui', () => expect(statusAoFechar(20400, 20400)).toBe('concluido'));
  it('progresso acima da meta expira', () => expect(statusAoFechar(21000, 20400)).toBe('expirado'));
});

describe('diasRestantes', () => {
  it('segunda-feira (início da semana) até domingo (dataFim) são 6 dias restantes', () => {
    expect(diasRestantes(new Date(2026, 9, 19), '2026-10-25')).toBe(6);
  });
  it('sábado tem 1 dia restante', () => {
    expect(diasRestantes(new Date(2026, 9, 24), '2026-10-25')).toBe(1);
  });
  it('domingo (último dia) tem 0 dias restantes', () => {
    expect(diasRestantes(new Date(2026, 9, 25), '2026-10-25')).toBe(0);
  });
});

describe('textoDiasRestantes', () => {
  it('0 vira "Último dia"', () => expect(textoDiasRestantes(0)).toBe('Último dia'));
  it('1 vira singular "1 dia restante"', () => expect(textoDiasRestantes(1)).toBe('1 dia restante'));
  it('6 vira plural "6 dias restantes"', () => expect(textoDiasRestantes(6)).toBe('6 dias restantes'));
});

describe('textoResultadoAnterior', () => {
  it('concluído gera a frase de resultado', () => {
    expect(textoResultadoAnterior({ ...DESAFIO_ATIVO, status: 'concluido' }))
      .toBe('Você fechou a semana passada dentro do combinado.');
  });
  it('expirado não gera texto', () => {
    expect(textoResultadoAnterior({ ...DESAFIO_ATIVO, status: 'expirado' })).toBeNull();
  });
  it('sem desafio anterior não gera texto', () => {
    expect(textoResultadoAnterior(null)).toBeNull();
  });
});
```

- [ ] **Step 7: Rodar e confirmar que falha, implementar, rodar e confirmar que passa**

`diasRestantes`: diferença em dias de calendário entre `paraISOLocal(hoje)` e `dataFim` (reusar
`diferencaEmDiasLocal` de `domain/data.ts` se a assinatura servir; senão, diferença direta de
dias via `dataLocalDeISO`). `textoDiasRestantes`: `0` → `'Último dia'`; `1` →
`'1 dia restante'`; senão → `` `${dias} dias restantes` ``. `statusAoFechar`:
`progressoSegundos <= metaSegundos ? 'concluido' : 'expirado'`. `textoResultadoAnterior`:
`desafioAnterior?.status === 'concluido' ? 'Você fechou a semana passada dentro do combinado.' : null`.

Run: `npx jest src/domain/desafioReducao.test.ts`
Expected: PASS (todos os testes do arquivo).

- [ ] **Step 8: Commit**

```bash
git add src/domain/desafioReducao.ts src/domain/types.ts src/domain/desafioReducao.test.ts
git commit -m "feat: calcula progresso, fechamento e dias restantes do desafio de redução"
```

---

## Task 3: `buscarDesafio` em `services/firestore.ts`

**Files:**
- Modify: `src/services/firestore.ts`
- Test: `src/services/firestore.test.ts`

**Interfaces:**
- Consumes: `documentoDesafio(uid, challengeId)` (já existe, privada no arquivo), `criarDesafio`
  (já existe).
- Produces: `buscarDesafio(uid: string, challengeId: string): Promise<Desafio | null>` — usado
  pela Task 5.

- [ ] **Step 1: Escrever o teste**

```typescript
describe('buscarDesafio', () => {
  it('retorna null quando o documento não existe', async () => {
    expect(await buscarDesafio('uid-1', 'reducao_tempo_redes-2026-10-12')).toBeNull();
  });

  it('retorna o desafio gravado por criarDesafio', async () => {
    const desafio = {
      id: 'reducao_tempo_redes-2026-10-12', titulo: 'Até 5h 40min nas redes esta semana',
      tipo: 'reducao_tempo_redes', periodo: 'semanal',
      dataInicio: '2026-10-12', dataFim: '2026-10-18',
      meta: 20400, progresso: 0, status: 'ativo', baseSegundos: 22800,
    };
    await criarDesafio('uid-1', desafio as any);

    expect(await buscarDesafio('uid-1', desafio.id)).toMatchObject(desafio);
  });
});
```

Adicionar `buscarDesafio` ao bloco de `import` no topo do arquivo de teste.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx jest src/services/firestore.test.ts -t "buscarDesafio"`
Expected: FAIL — `buscarDesafio` não exportada.

- [ ] **Step 3: Implementar `buscarDesafio` em `src/services/firestore.ts`, perto de `buscarDesafiosAtivos`**

```typescript
export async function buscarDesafio(
  uid: string,
  challengeId: string,
): Promise<Desafio | null> {
  const snapshot = await getDoc(documentoDesafio(uid, challengeId));
  return snapshot.exists() ? (snapshot.data() as Desafio) : null;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx jest src/services/firestore.test.ts -t "buscarDesafio"`
Expected: PASS 2/2.

- [ ] **Step 5: Commit**

```bash
git add src/services/firestore.ts src/services/firestore.test.ts
git commit -m "feat: adiciona busca de um desafio por id em services/firestore"
```

---

## Task 4: proteger `useDesafios` do desafio de redução

**Files:**
- Modify: `src/hooks/useDesafios.ts`
- Test: `src/hooks/useDesafios.test.ts`

**Interfaces:**
- Consumes: nenhuma interface nova — só filtra o que `buscarDesafiosAtivos` já devolve.

- [ ] **Step 1: Escrever o teste**

```typescript
it('ignora um desafio de redução ativo no pool — não é tratado como o semanal do catálogo nem fechado por ela', async () => {
  const desafioReducao = {
    id: 'reducao_tempo_redes-2026-09-14', titulo: 'Até 5h 40min nas redes esta semana',
    tipo: 'reducao_tempo_redes', periodo: 'semanal',
    dataInicio: '2026-09-14', dataFim: '2026-09-20',
    meta: 20400, progresso: 10000, status: 'ativo',
  };
  firestore.buscarDesafiosAtivos.mockResolvedValue([desafioReducao]);

  const { result } = renderHook(() => useDesafios('uid-1'));
  await waitFor(() => expect(result.current.carregando).toBe(false));

  expect(result.current.desafioSemanal).toMatchObject({ tipo: 'essencial_todo_dia' });
  expect(firestore.atualizarProgressoDesafio).not.toHaveBeenCalledWith(
    'uid-1', 'reducao_tempo_redes-2026-09-14', expect.anything(), expect.anything(),
  );
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx jest src/hooks/useDesafios.test.ts -t "ignora um desafio de redução"`
Expected: FAIL — sem o filtro, `resolverDesafio` casa o desafio de redução como "existente" pro
semanal (mesmo `periodo`/`dataInicio`) e o teste encontra `tipo: 'reducao_tempo_redes'` em vez de
`'essencial_todo_dia'`, ou o `calcularProgressoDesafio` lança por `tipo` fora do `switch`.

- [ ] **Step 3: Implementar o filtro em `carregar()`, logo depois de `buscarDesafiosAtivos`**

```typescript
const todosAtivos = await buscarDesafiosAtivos(uid);
// O desafio de redução (domain/desafioReducao.ts) vive fora desse pool — tem o
// mesmo periodo/dataInicio do semanal do catálogo e confundiria resolverDesafio,
// além de calcularProgressoDesafio não ter case pra esse tipo.
const ativos = todosAtivos.filter(desafio => desafio.tipo !== 'reducao_tempo_redes');
```

(substitui a variável `ativos` usada depois no mesmo escopo).

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx jest src/hooks/useDesafios.test.ts`
Expected: PASS (todos os testes do arquivo).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useDesafios.ts src/hooks/useDesafios.test.ts
git commit -m "fix: useDesafios ignora o desafio de redução no pool de ativos"
```

---

## Task 5: `useDesafioReducao`

**Files:**
- Create: `src/hooks/useDesafioReducao.ts`
- Test: `src/hooks/useDesafioReducao.test.ts`
- Modify: `src/utils/storage.ts`

**Interfaces:**
- Consumes: `calcularBaseSegundos`, `atingeMinimoParaProposta`, `montarProposta`,
  `calcularProgressoReducao`, `statusAoFechar`, `diasRestantes`, `textoDiasRestantes`,
  `textoResultadoAnterior`, `PropostaDesafioReducao` (Tasks 1-2); `buscarDesafiosAtivos`,
  `buscarDesafio`, `criarDesafio`, `atualizarProgressoDesafio`, `buscarDailyLogsNoIntervalo`,
  `buscarUsuario` (`services/firestore.ts`); `inicioDaSemana` (`domain/streak.ts`);
  `paraISOLocal` (`domain/data.ts`); `logDesafioReducaoFechado` (Task 6 — se a Task 6 ainda não
  rodou, use um `jest.mock('../services/analytics')` no teste e implemente contra a assinatura
  do design: `logDesafioReducaoFechado(resultado: 'concluido' | 'expirado'): void`);
  `STORAGE_KEYS`, `lerItem`, `salvarItem` (`utils/storage.ts`).
- Produces:
  ```typescript
  interface UseDesafioReducaoResultado {
    proposta: PropostaDesafioReducao | null;
    desafioAtivo: (Desafio & { diasRestantesTexto: string; ultrapassou: boolean; semMedicaoDesde: string | null }) | null;
    resultadoAnteriorTexto: string | null;
    carregando: boolean;
    aceitar: () => Promise<void>;
    recusar: () => Promise<void>;
    recarregar: () => Promise<void>;
  }
  export function useDesafioReducao(uid: string, reflexaoVisivel: boolean): UseDesafioReducaoResultado
  ```
  `reflexaoVisivel` é a condição 1 da elegibilidade ("a reflexão já precisa estar aparecendo") —
  `ProgressoScreen` já calcula isso (`!!reflexao` de `useResumoRedes`); o hook recebe pronto em
  vez de duplicar a conta de `diasComUsoApps`/consentimento que `reflexaoSemanal` já faz. Usado
  pela Task 9 (`ProgressoScreen`).

- [ ] **Step 1: Adicionar a chave nova em `src/utils/storage.ts`**

```typescript
/** Segunda-feira (YYYY-MM-DD) da semana em que a proposta do desafio de redução foi recusada. */
desafioReducaoPropostaRecusadaEm: 'desafio_reducao_proposta_recusada_em',
```

(no objeto `STORAGE_KEYS`, mesmo padrão de `reflexaoSemanalVista`).

- [ ] **Step 2: Escrever o teste do caso "mostra a proposta"**

```typescript
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useDesafioReducao } from './useDesafioReducao';

jest.mock('../services/firestore');
jest.mock('../services/analytics');
jest.mock('../services/crashlytics');
jest.mock('./useToast');

const firestore = require('../services/firestore');
const { useToast } = require('./useToast');
const showToast = jest.fn();

const SEMANA_ANTERIOR_INICIO = '2026-10-12';
const SEMANA_ATUAL_INICIO = '2026-10-19';

function logComUso(data: string, segundos: number) {
  return { data, usoApps: { 'com.instagram.android': { segundos, aberturas: 1 } } };
}

describe('useDesafioReducao', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-10-19T12:00:00Z')); // segunda
    useToast.mockReturnValue({ showToast });
    firestore.buscarUsuario.mockResolvedValue({
      consentimentoAcessoUso: '2026-01-01',
      regrasBloqueio: { apps: ['com.instagram.android'] },
    });
    firestore.buscarDesafiosAtivos.mockResolvedValue([]);
    firestore.buscarDesafio.mockResolvedValue(null);
    firestore.buscarDailyLogsNoIntervalo.mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => logComUso(`2026-10-${12 + i}`, 3600)), // 7h na semana anterior
    );
    firestore.criarDesafio.mockResolvedValue(undefined);
    firestore.atualizarProgressoDesafio.mockResolvedValue(undefined);
  });

  afterEach(() => jest.useRealTimers());

  it('com base acima de 1h, sem desafio ativo nem resposta prévia, monta a proposta', async () => {
    const { result } = renderHook(() => useDesafioReducao('uid-1', true));

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.proposta).toMatchObject({ titulo: 'Até 6h 20min nas redes' });
    expect(result.current.desafioAtivo).toBeNull();
  });

  it('com a reflexão não visível (reflexaoVisivel false), não propõe mesmo com base acima de 1h', async () => {
    const { result } = renderHook(() => useDesafioReducao('uid-1', false));

    await waitFor(() => expect(result.current.carregando).toBe(false));

    expect(result.current.proposta).toBeNull();
  });
});
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `npx jest src/hooks/useDesafioReducao.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 4: Implementar `useDesafioReducao` — carregamento, fechamento preguiçoso e proposta**

No `carregar()` (chamado no mount, mesmo padrão de `useDesafios`):
1. `buscarUsuario(uid)` pra obter `regrasBloqueio.apps` (`appsBloqueados`) e calcular
   `comAcessoDeUso = !!usuario?.consentimentoAcessoUso && appsBloqueados.length > 0` — mesma
   definição exata de `mostrarResumoDetalhado` em `useResumoRedes.ts`; sem apps, não há
   elegibilidade possível (as funções puras já tratam base 0).
2. `buscarDesafiosAtivos(uid)`, filtra `tipo === 'reducao_tempo_redes'` → no máximo um resultado,
   chame `desafioAtivoCru`.
3. Se `desafioAtivoCru` existe e `paraISOLocal(hoje) > desafioAtivoCru.dataFim`: busca os
   `dailyLogsNoIntervalo` da semana dele, roda `calcularProgressoReducao` (com o
   `comAcessoDeUso` do passo 1), fecha com `statusAoFechar`, grava via
   `atualizarProgressoDesafio`, chama `logDesafioReducaoFechado(status)`, e trata como se não
   houvesse desafio ativo (`desafioAtivoCru = null`) pro resto do cálculo desta mesma passada.
4. Com `desafioAtivoCru` ainda ativo (não fechado): busca os `dailyLogsNoIntervalo` da semana
   dele, roda `calcularProgressoReducao`, grava se mudou (mesmo padrão `useDesafios`), monta
   `desafioAtivo` com `diasRestantesTexto = textoDiasRestantes(diasRestantes(hoje, dataFim))`.
   Sem proposta (`proposta = null`) nesse caso.
5. Sem `desafioAtivoCru` (nunca existiu ou acabou de ser fechado): calcula
   `inicioSemanaAnteriorISO` (igual ao padrão de `useResumoRedes.inicioDaSemanaAnteriorISO`, pode
   duplicar a mesma conta de 3 linhas aqui — é pequena e já é duplicada entre `resumoRedes.ts`
   e `useResumoRedes.ts`), lê `buscarDesafio(uid, `reducao_tempo_redes-${inicioSemanaAnteriorISO}`)`
   pra achar `resultadoAnteriorTexto = textoResultadoAnterior(doc)`. Em seguida busca
   `dailyLogsNoIntervalo` da semana anterior, calcula `calcularBaseSegundos`; se
   `reflexaoVisivel` (condição 1) E `atingeMinimoParaProposta(base)` (condição 2) E a chave
   `desafioReducaoPropostaRecusadaEm` no AsyncStorage não é a segunda-feira atual (condição 4 —
   condição 3, "nenhum ativo", já está garantida por não haver `desafioAtivoCru` neste ramo):
   `proposta = montarProposta(base)`. Senão, `proposta = null`.
6. `setCarregando(false)`.

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx jest src/hooks/useDesafioReducao.test.ts`
Expected: PASS 1/1.

- [ ] **Step 6: Escrever os testes de `aceitar`, `recusar` e fechamento, rodar RED, implementar, rodar GREEN**

```typescript
it('aceitar cria o desafio da semana com a meta da proposta e some com a proposta', async () => {
  const { result } = renderHook(() => useDesafioReducao('uid-1', true));
  await waitFor(() => expect(result.current.carregando).toBe(false));

  await act(async () => { await result.current.aceitar(); });

  expect(firestore.criarDesafio).toHaveBeenCalledWith('uid-1', expect.objectContaining({
    id: 'reducao_tempo_redes-2026-10-19',
    tipo: 'reducao_tempo_redes',
    dataInicio: '2026-10-19',
    dataFim: '2026-10-25',
    meta: 20400,
    progresso: 0,
    status: 'ativo',
    baseSegundos: 22800,
  }));
  expect(result.current.proposta).toBeNull();
});

it('recusar grava a semana no AsyncStorage e some com a proposta sem criar desafio', async () => {
  const { result } = renderHook(() => useDesafioReducao('uid-1', true));
  await waitFor(() => expect(result.current.carregando).toBe(false));

  await act(async () => { await result.current.recusar(); });

  expect(firestore.criarDesafio).not.toHaveBeenCalled();
  expect(result.current.proposta).toBeNull();
});

it('um desafio de redução de duas semanas atrás, esquecido e ainda ativo, é fechado pelo carregamento', async () => {
  const desafioAntigo = {
    id: 'reducao_tempo_redes-2026-10-05', titulo: 'Até 3h nas redes esta semana',
    tipo: 'reducao_tempo_redes', periodo: 'semanal',
    dataInicio: '2026-10-05', dataFim: '2026-10-11',
    meta: 10800, progresso: 0, status: 'ativo',
  };
  firestore.buscarDesafiosAtivos.mockResolvedValue([desafioAntigo]);
  firestore.buscarDailyLogsNoIntervalo.mockResolvedValue([logComUso('2026-10-05', 9000)]); // abaixo da meta

  const { result } = renderHook(() => useDesafioReducao('uid-1', true));
  await waitFor(() => expect(result.current.carregando).toBe(false));

  expect(firestore.atualizarProgressoDesafio).toHaveBeenCalledWith(
    'uid-1', 'reducao_tempo_redes-2026-10-05', 9000, 'concluido',
  );
  expect(result.current.desafioAtivo).toBeNull();
});
```

`aceitar()`: monta o `Desafio` (`id: 'reducao_tempo_redes-' + inicioSemanaAtualISO`, `titulo`
`` `Até ${formatarDuracao(meta)} nas redes esta semana` `` — reaproveita `formatarDuracao`),
chama `criarDesafio`, `logDesafioReducaoRespondido('aceitou')`, limpa `proposta` e recarrega (ou
seta `desafioAtivo` direto). `recusar()`: `salvarItem(STORAGE_KEYS.desafioReducaoPropostaRecusadaEm, semanaAtualISO)`,
`logDesafioReducaoRespondido('agora_nao')`, limpa `proposta`.

Run: `npx jest src/hooks/useDesafioReducao.test.ts`
Expected: PASS (todos os testes do arquivo).

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useDesafioReducao.ts src/hooks/useDesafioReducao.test.ts src/utils/storage.ts
git commit -m "feat: hook useDesafioReducao orquestra proposta, aceite, recusa e fechamento"
```

---

## Task 6: eventos de Analytics

**Files:**
- Modify: `src/services/analytics.ts`, `src/hooks/useAnalytics.ts`
- Test: `src/services/analytics.test.ts`

**Interfaces:**
- Produces: `logDesafioReducaoProposto(): void`,
  `logDesafioReducaoRespondido(acao: 'aceitou' | 'agora_nao'): void`,
  `logDesafioReducaoFechado(resultado: 'concluido' | 'expirado'): void` — consumidas pela Task 5
  (já escrita contra essa assinatura) e pela Task 9.

- [ ] **Step 1: Escrever os testes**

```typescript
it('logDesafioReducaoProposto envia o evento sem parâmetros', () => {
  logDesafioReducaoProposto();
  expect(analyticsMock.logEvent).toHaveBeenCalledWith(expect.anything(), 'desafio_reducao_proposto');
});

it('logDesafioReducaoRespondido envia a ação', () => {
  logDesafioReducaoRespondido('aceitou');
  expect(analyticsMock.logEvent).toHaveBeenCalledWith(
    expect.anything(), 'desafio_reducao_respondido', { acao: 'aceitou' },
  );
});

it('logDesafioReducaoFechado envia o resultado, sem tempo/meta/base/app', () => {
  logDesafioReducaoFechado('concluido');
  expect(analyticsMock.logEvent).toHaveBeenCalledWith(
    expect.anything(), 'desafio_reducao_fechado', { resultado: 'concluido' },
  );
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx jest src/services/analytics.test.ts -t "DesafioReducao"`
Expected: FAIL — funções não exportadas.

- [ ] **Step 3: Implementar em `src/services/analytics.ts`, e expor em `src/hooks/useAnalytics.ts`**

Mesmo padrão de `logValvulaEscolhida`/`logAlternativaEscolhida`. Adicionar as 3 funções ao objeto
retornado por `useAnalytics` (ordem alfabética, como as demais).

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx jest src/services/analytics.test.ts`
Expected: PASS (todos os testes do arquivo).

- [ ] **Step 5: Commit**

```bash
git add src/services/analytics.ts src/hooks/useAnalytics.ts src/services/analytics.test.ts
git commit -m "feat: eventos de analytics do desafio de redução de tempo nas redes"
```

---

## Task 7: `ChallengeCard` — variante "teto"

**Files:**
- Modify: `src/components/challenges/ChallengeCard.tsx`
- Test: `src/components/challenges/ChallengeCard.test.tsx`

**Interfaces:**
- Consumes: nada novo (a tela já formata os textos via `domain/desafioReducao.ts` antes de
  passar como props — ver Task 2).
- Produces: props novas em `ChallengeCardProps`: `variante?: 'piso' | 'teto'` (default `'piso'`),
  `diasRestantesTexto?: string`, `ultrapassou?: boolean`, `semMedicaoDesde?: string` — usadas pela
  Task 9.

- [ ] **Step 1: Escrever os testes**

```typescript
it('variante teto: mostra a duração formatada e os dias restantes em vez de "X de Y"', async () => {
  await render(
    <ChallengeCard
      titulo="Até 5h 40min nas redes esta semana"
      progresso={3600} meta={20400} status="ativo"
      variante="teto" diasRestantesTexto="4 dias restantes"
    />,
  );

  expect(screen.getByText('1h de 5h 40min')).toBeTruthy();
  expect(screen.getByText('4 dias restantes')).toBeTruthy();
});

it('variante teto, ultrapassou: barra cheia e a frase de ultrapassagem, sem Concluído nem cor de erro', async () => {
  await render(
    <ChallengeCard
      titulo="Até 5h 40min nas redes esta semana"
      progresso={21600} meta={20400} status="ativo"
      variante="teto" diasRestantesTexto="1 dia restante" ultrapassou
    />,
  );

  expect(larguraBarra()).toBe('100%');
  expect(screen.getByText('Passou do combinado desta semana. Na segunda tem outra proposta.')).toBeTruthy();
  expect(screen.queryByText('Concluído.')).toBeNull();
});

it('variante teto, sem medição: mostra a frase de interrupção', async () => {
  await render(
    <ChallengeCard
      titulo="Até 5h 40min nas redes esta semana"
      progresso={3600} meta={20400} status="ativo"
      variante="teto" diasRestantesTexto="2 dias restantes" semMedicaoDesde="quarta-feira"
    />,
  );

  expect(screen.getByText('Sem medição desde quarta-feira')).toBeTruthy();
});

it('variante piso (default) continua igual a antes', async () => {
  await render(<ChallengeCard titulo="Exercite-se 3x essa semana" progresso={2} meta={3} status="ativo" />);
  expect(screen.getByText('2 de 3')).toBeTruthy();
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx jest src/components/challenges/ChallengeCard.test.tsx`
Expected: FAIL — `variante`/`diasRestantesTexto`/`ultrapassou`/`semMedicaoDesde` ignoradas, texto
"1h de 5h 40min" não existe.

- [ ] **Step 3: Implementar a variante teto**

Com `variante === 'teto'`: a linha de contagem usa `` `${formatarDuracao(progresso)} de ${formatarDuracao(meta)}` ``
(importar `formatarDuracao` de `domain/resumoRedes.ts`) em vez de `{progresso} de {meta}`; some
`diasRestantesTexto` como linha extra; a mensagem de status vira, em ordem de prioridade,
`ultrapassou` → "Passou do combinado desta semana. Na segunda tem outra proposta.",
`semMedicaoDesde` → `` `Sem medição desde ${semMedicaoDesde}` ``, senão nenhuma (nunca usa
`MENSAGEM_STATUS`, que é só da variante piso). Barra: `fracao` já clampada em 1 cobre o caso
"cheia sem estourar"; cor sempre `theme.colors.musgo` nas duas variantes (nenhuma mudança aqui).

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx jest src/components/challenges/ChallengeCard.test.tsx`
Expected: PASS (todos os testes do arquivo, incluindo os 4 preexistentes da variante piso).

- [ ] **Step 5: Commit**

```bash
git add src/components/challenges/ChallengeCard.tsx src/components/challenges/ChallengeCard.test.tsx
git commit -m "feat: ChallengeCard ganha a variante teto do desafio de redução"
```

---

## Task 8: `ReflexaoSemanalSheet` — bloco da proposta e resultado anterior

**Files:**
- Modify: `src/components/progress/ReflexaoSemanalSheet.tsx`
- Test: `src/components/progress/ReflexaoSemanalSheet.test.tsx`

**Interfaces:**
- Consumes: `PropostaDesafioReducao` (Task 1).
- Produces: props novas em `ReflexaoSemanalSheetProps`: `proposta?: PropostaDesafioReducao | null`,
  `resultadoAnteriorTexto?: string | null`, `onAceitarProposta?: () => void` — usadas pela Task 9.

- [ ] **Step 1: Escrever os testes**

```typescript
const PROPOSTA = {
  titulo: 'Até 5h 40min nas redes',
  linha: 'Cerca de 40 min a menos que a semana passada. Pequeno de propósito.',
  metaSegundos: 20400, baseSegundos: 22800,
};

it('com proposta, mostra o bloco no lugar de Entendi/Agora não', async () => {
  await render(
    <ReflexaoSemanalSheet visible dados={DADOS} proposta={PROPOSTA}
      onEntendi={jest.fn()} onAgoraNao={jest.fn()} onAceitarProposta={jest.fn()} />,
  );

  expect(screen.getByText('PROPOSTA PARA ESTA SEMANA')).toBeTruthy();
  expect(screen.getByText('Até 5h 40min nas redes')).toBeTruthy();
  expect(screen.getByText('Cerca de 40 min a menos que a semana passada. Pequeno de propósito.')).toBeTruthy();
  expect(screen.getByText('Aceitar')).toBeTruthy();
  expect(screen.getByText('Agora não')).toBeTruthy();
  expect(screen.queryByText('Entendi')).toBeNull();
});

it('"Aceitar" chama onAceitarProposta, não onEntendi', async () => {
  const onAceitarProposta = jest.fn();
  const onEntendi = jest.fn();
  await render(
    <ReflexaoSemanalSheet visible dados={DADOS} proposta={PROPOSTA}
      onEntendi={onEntendi} onAgoraNao={jest.fn()} onAceitarProposta={onAceitarProposta} />,
  );

  await fireEvent.press(screen.getByText('Aceitar'));

  expect(onAceitarProposta).toHaveBeenCalledTimes(1);
  expect(onEntendi).not.toHaveBeenCalled();
});

it('sem proposta, continua mostrando Entendi/Agora não como antes', async () => {
  await render(
    <ReflexaoSemanalSheet visible dados={DADOS} onEntendi={jest.fn()} onAgoraNao={jest.fn()} />,
  );

  expect(screen.getByText('Entendi')).toBeTruthy();
  expect(screen.queryByText('PROPOSTA PARA ESTA SEMANA')).toBeNull();
});

it('com resultadoAnteriorTexto, mostra a frase acima do título', async () => {
  await render(
    <ReflexaoSemanalSheet visible dados={DADOS}
      resultadoAnteriorTexto="Você fechou a semana passada dentro do combinado."
      onEntendi={jest.fn()} onAgoraNao={jest.fn()} />,
  );

  expect(screen.getByText('Você fechou a semana passada dentro do combinado.')).toBeTruthy();
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx jest src/components/progress/ReflexaoSemanalSheet.test.tsx`
Expected: FAIL — bloco/props novas não existem.

- [ ] **Step 3: Implementar**

`resultadoAnteriorTexto` truthy → `<Text>` acima do `eyebrow` atual (mesmo estilo de texto
pequeno/secundário já usado em outro lugar da sheet, ex. `styles.contadorRotulo` adaptado ou um
novo `styles.resultadoAnterior` simples). `proposta` truthy substitui o bloco final (o
`PrimaryButton` "Entendi" + link "Agora não") por: eyebrow "PROPOSTA PARA ESTA SEMANA", título
(`proposta.titulo`), linha (`proposta.linha`), `PrimaryButton` "Aceitar" chamando
`onAceitarProposta`, e o mesmo link "Agora não" de hoje (continua chamando `onAgoraNao` — a
sheet não precisa saber que isso também recusa a proposta, isso é responsabilidade de quem a
monta, ver Task 9). Sem `proposta`, o bloco final fica exatamente como está hoje.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx jest src/components/progress/ReflexaoSemanalSheet.test.tsx`
Expected: PASS (todos os testes do arquivo, incluindo os 4 preexistentes).

- [ ] **Step 5: Commit**

```bash
git add src/components/progress/ReflexaoSemanalSheet.tsx src/components/progress/ReflexaoSemanalSheet.test.tsx
git commit -m "feat: ReflexaoSemanalSheet mostra a proposta do desafio de redução"
```

---

## Task 9: `ProgressoScreen` — conecta tudo

**Files:**
- Modify: `src/screens/progress/ProgressoScreen.tsx`
- Test: `src/screens/progress/ProgressoScreen.test.tsx`

**Interfaces:**
- Consumes: `useDesafioReducao(uid, reflexaoVisivel)` (Task 5) — chamado como
  `useDesafioReducao(uid, !!reflexao)`, reaproveitando o `reflexao` que `useResumoRedes` já
  calcula nesta mesma tela; `proposta`/`resultadoAnteriorTexto`/`onAceitarProposta` (Task 8);
  `variante`/`diasRestantesTexto`/`ultrapassou`/`semMedicaoDesde` (Task 7).

- [ ] **Step 1: Escrever os testes**

```typescript
it('mostra a proposta do desafio de redução dentro da reflexão quando elegível', async () => {
  configurarDesafioReducao({ proposta: { titulo: 'Até 5h 40min nas redes', linha: 'Cerca de 40 min a menos...', metaSegundos: 20400, baseSegundos: 22800 } });
  // (mesmo padrão de configurarDesafios/configurarResumoRedes já existentes neste arquivo)

  await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={jest.fn()} />);

  expect(screen.getByText('Até 5h 40min nas redes')).toBeTruthy();
});

it('aceitar a proposta chama aceitar() do hook e mostra o toast de combinado', async () => {
  const aceitar = jest.fn();
  configurarDesafioReducao({ proposta: PROPOSTA_PADRAO, aceitar });

  await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={jest.fn()} />);
  await fireEvent.press(screen.getByText('Aceitar'));

  expect(aceitar).toHaveBeenCalledTimes(1);
  // toast: ver padrão de showToast mockado já usado nos outros testes deste arquivo.
});

it('"Agora não" com proposta visível chama recusar() do hook, além de fechar a reflexão como antes', async () => {
  const recusar = jest.fn();
  configurarDesafioReducao({ proposta: PROPOSTA_PADRAO, recusar });

  await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={jest.fn()} />);
  await fireEvent.press(screen.getByText('Agora não'));

  expect(recusar).toHaveBeenCalledTimes(1);
});

it('com desafio de redução ativo, mostra o ChallengeCard na variante teto', async () => {
  configurarDesafioReducao({ desafioAtivo: { titulo: 'Até 5h 40min nas redes esta semana', progresso: 3600, meta: 20400, status: 'ativo', diasRestantesTexto: '4 dias restantes', ultrapassou: false, semMedicaoDesde: null } });

  await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={jest.fn()} />);

  expect(screen.getByText('Até 5h 40min nas redes esta semana')).toBeTruthy();
  expect(screen.getByText('4 dias restantes')).toBeTruthy();
});
```

Adapte os nomes exatos de `configurarDesafioReducao`/`PROPOSTA_PADRAO` ao estilo já existente no
arquivo (`configurarDesafios`, `configurarResumoRedes` etc.) — siga o padrão de mock já usado
pelas outras duas chamadas de hook desta tela.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx jest src/screens/progress/ProgressoScreen.test.tsx`
Expected: FAIL — `useDesafioReducao` não mockado/conectado, textos não aparecem.

- [ ] **Step 3: Implementar a conexão em `ProgressoScreen.tsx`**

`jest.mock('../../hooks/useDesafioReducao')` no teste, igual às outras. Na tela: importa e chama
`useDesafioReducao(uid)`; `fecharReflexao` (já existente) ganha uma chamada condicional a
`recusarPropostaDesafio()` quando `proposta` não é nulo, antes/depois de gravar
`reflexaoSemanalVista` (ordem não importa, os dois são independentes); novo handler
`aceitarPropostaDesafio` chama `aceitar()` do hook, `showToast('Combinado. Aparece no seu Progresso.')`
e fecha a sheet (reaproveita a mesma lógica de `fecharReflexao`, sem a chamada de
`logReflexaoSemanalFechada` já que aceitar tem seu próprio evento). Passa `proposta`,
`resultadoAnteriorTexto`, `onAceitarProposta={aceitarPropostaDesafio}` pro
`ReflexaoSemanalSheet`. Renderiza um `ChallengeCard` extra (variante `'teto'`) na seção
"Desafios" quando `desafioAtivo` não é nulo, com os mesmos campos que a Task 7 define.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx jest src/screens/progress/ProgressoScreen.test.tsx`
Expected: PASS (todos os testes do arquivo).

- [ ] **Step 5: Commit**

```bash
git add src/screens/progress/ProgressoScreen.tsx src/screens/progress/ProgressoScreen.test.tsx
git commit -m "feat: ProgressoScreen conecta a proposta e o acompanhamento do desafio de redução"
```

---

## Task 10: ferramenta de semeadura para teste manual (`__DEV__`)

**Files:**
- Create: `src/dev/semearDesafioReducao.ts`
- Modify: `src/config/debugFlags.ts`, `src/hooks/usePerfil.ts`, `src/screens/perfil/PerfilScreen.tsx`
- Test: `src/screens/perfil/PerfilScreen.test.tsx`

**Interfaces:**
- Consumes: `salvarDailyLog`, `criarDesafio`, `buscarUsuario` (`services/firestore.ts`);
  `inicioDaSemana` (`domain/streak.ts`); `paraISOLocal` (`domain/data.ts`).
- Produces: `semearSemanaDesafioReducao(uid: string, resultado: 'concluido' | 'expirado'): Promise<void>`
  (`src/dev/semearDesafioReducao.ts`) — só chamada por `usePerfil`.

- [ ] **Step 1: Adicionar o flag em `src/config/debugFlags.ts`**

```typescript
/**
 * MOSTRAR_SEMEAR_DESAFIO_REDUCAO: os botões de semeadura do desafio de
 * redução de tempo nas redes só rodam em `__DEV__` — mesmo motivo de
 * MOSTRAR_TESTAR_CRASHLYTICS acima (device físico via WSL não alcança o
 * Metro). Ligar à mão só pra gerar o APK de teste, nunca commitar como `true`.
 */
export const MOSTRAR_SEMEAR_DESAFIO_REDUCAO = false;
```

- [ ] **Step 2: Implementar `semearSemanaDesafioReducao` em `src/dev/semearDesafioReducao.ts`**

Sem teste automatizado próprio — é ferramenta de teste manual, não lógica de produto (a lógica
de cálculo que ela exercita já está testada nas Tasks 1-2). Lança (`throw`) se
`regrasBloqueio.apps` estiver vazio (sem app bloqueado configurado, não há o que semear). Usa
`inicioDaSemana(new Date())` pra achar a segunda-feira real atual e a real anterior (−7 dias);
grava `dailyLogs.usoApps` dos 7 dias da semana anterior pro primeiro app em
`regrasBloqueio.apps`, somando um total fixo conhecido (ex.: 22800s / 6h20min, o mesmo exemplo do
spec); cria via `criarDesafio` um documento `reducao_tempo_redes` datado pra essa mesma semana
anterior, `status: 'ativo'`, `meta` calculada (reaproveita `calcularMetaSegundos` da Task 1) e
`progresso` fixado conforme o `resultado` pedido: abaixo da meta pra `'concluido'`, acima pra
`'expirado'`.

- [ ] **Step 3: Expor em `usePerfil.ts` e renderizar em `PerfilScreen.tsx`**

Em `usePerfil(uid)`: `semearDesafioReducaoConcluido: () => Promise<void>` e
`semearDesafioReducaoExpirado: () => Promise<void>`, cada um chamando
`semearSemanaDesafioReducao(uid, 'concluido' | 'expirado')` dentro de um `try/catch` (mesmo
padrão de `salvarPorque`): sucesso mostra `showToast('Semeado — abra o Progresso pra ver.')`,
falha chama `registrarErro` + `showToast('Não foi possível semear. Configure um app bloqueado primeiro.')`.
Em `PerfilScreen.tsx`, dois `Pressable` novos ao lado do de Crashlytics, atrás de
`__DEV__ || MOSTRAR_SEMEAR_DESAFIO_REDUCAO`, reaproveitando `styles.debugLink`/`styles.debugTexto`:
"🌱 Semear semana (fecha concluído)" e "🌱 Semear semana (fecha expirado)".

- [ ] **Step 4: Escrever o teste em `PerfilScreen.test.tsx`, rodar RED, confirmar GREEN**

Mesmo padrão do teste existente "aparece em `__DEV__` e chama `testarCrash` do hook ao tocar"
(linha ~511), um teste por botão novo, chamando
`semearDesafioReducaoConcluido`/`semearDesafioReducaoExpirado` mockados em `configurarPerfilPadrao`.

Run: `npx jest src/screens/perfil/PerfilScreen.test.tsx`
Expected: FAIL (botões/handlers não existem) → implementar → PASS (todos os testes do arquivo).

- [ ] **Step 5: Commit**

```bash
git add src/dev/semearDesafioReducao.ts src/config/debugFlags.ts src/hooks/usePerfil.ts src/screens/perfil/PerfilScreen.tsx src/screens/perfil/PerfilScreen.test.tsx
git commit -m "chore: ferramenta de semeadura do desafio de redução pra teste manual (__DEV__)"
```

---

## Task 11: documentação

**Files:**
- Modify: `docs/projeto/regras-de-negocio.md`, `docs/projeto/schema.md`

- [ ] **Step 1: `regras-de-negocio.md` — nova subseção na seção 4**

Adicionar "### Desafio de redução de tempo nas redes" depois da tabela do catálogo (linha ~147),
resumindo elegibilidade (1h mínimo, nenhum ativo, não respondida), base (7 dias / 4-6 dias ×7),
meta (×0,9 arredondado pra baixo ao múltiplo de 5min), progresso (recalculado, nunca
incrementado, congela sem acesso de uso), fechamento (concluído ≤ meta, expirado senão, texto só
quando concluído) e a convivência com o catálogo (filtro em `useDesafios`).

- [ ] **Step 2: `regras-de-negocio.md` — ajustar a subseção `ReflexaoSemanalSheet` (seção 5)**

Remover a linha "Não propõe desafio nem meta." (ficou obsoleta) e acrescentar uma linha curta
apontando pra nova subseção da seção 4.

- [ ] **Step 3: `schema.md` — campo novo e tipo novo**

Na tabela de `users/{userId}/challenges/{challengeId}`, documentar `baseSegundos` (number,
opcional, só no desafio de redução) e mencionar `'reducao_tempo_redes'` como um `tipo` fora do
catálogo fixo (referenciar `domain/desafioReducao.ts`).

- [ ] **Step 4: Commit**

```bash
git add docs/projeto/regras-de-negocio.md docs/projeto/schema.md
git commit -m "docs: desafio de redução de tempo nas redes em regras-de-negocio e schema"
```

---

## Task 12: verificação final

- [ ] **Step 1: Suite completa**

Run: `npx jest`
Expected: todos os suites e testes passando, sem warning novo.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: sem erro novo (warnings pré-existentes, se algum, iguais aos de antes desta branch).

- [ ] **Step 3: Tipos**

Run: `npx tsc --noEmit`
Expected: sem erro.

- [ ] **Step 4: Commit (se alguma correção de lint/tipo foi necessária)**

```bash
git add -A
git commit -m "chore: ajustes finais de lint/tipos do desafio de redução"
```
