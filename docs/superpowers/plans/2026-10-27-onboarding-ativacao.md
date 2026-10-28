# Revisão de onboarding, tutorial e ativação do bloqueio — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** alinhar tutorial, onboarding e o caminho de ativação do bloqueio ao produto atual
(bloqueio de redes sociais + HU-07), e medir desistência passo a passo no onboarding.

**Architecture:** mudanças de conteúdo em componentes "burros" existentes
(`OnboardingStepPrimeiraTarefa`, `TutorialScreen`); novos eventos de Analytics puros
(`services/analytics.ts`); novo hook de gate (`useAtivacaoBloqueio`, mesmo molde de
`useLocalNotifications`) e nova tela/stack (`AtivacaoConviteScreen` + `AtivacaoStack`) que
reaproveitam `BloqueioAppsScreen`/`DivulgacaoAcessibilidadeScreen`/`DivulgacaoAcessoUsoScreen`
como existem hoje; `RootNavigator` ganha um ramo novo entre onboarding completo e
`NotificationPriming`/`Main`.

**Tech Stack:** React Native CLI (bare) + TypeScript, Jest + React Native Testing Library,
React Navigation (native-stack).

**Spec:** `docs/superpowers/specs/2026-10-27-onboarding-ativacao-design.md`

## Global Constraints

- Onboarding continua com 4 passos — nenhum passo novo no wizard (`domain/onboarding.ts` não
  muda).
- Sem ponto de exclamação, sem "check-in", sem "proteção" fora do streak, sem promessa
  neurológica em nenhum texto novo.
- Textos de `DivulgacaoAcessibilidadeScreen`/`DivulgacaoAcessoUsoScreen` são imutáveis nesta
  tarefa — reaproveitar como estão, sem editar esses 2 arquivos.
- Nenhuma mudança de schema do Firestore — `focoProcrastinacao` mantém os mesmos 5 valores;
  o gate da ativação vive só em AsyncStorage.
- Nenhum evento de Analytics novo leva texto digitado (porquê, título de tarefa) — só índice,
  booleano ou enum fixo.
- Nenhum usuário que já concluiu o onboarding é levado a refazer um passo já respondido.

## Review Focus

- **Usuário que já concluiu o onboarding antes desta mudança** (gate `onboardingConcluido` já
  `true`, sem a flag nova `ativacao_bloqueio_mostrada`): deve ver a `AtivacaoConviteScreen` uma
  vez, sem nenhum passo do onboarding repetido — coberto por `RootNavigator.test.tsx`.
- **`focoProcrastinacao` nulo ou um valor diferente de `redes_sociais`** no passo "primeira
  tarefa": não deve mostrar os chips HU-07 nem a moldura de rolagem — coberto por
  `OnboardingStepPrimeiraTarefa.test.tsx`.
- **App fechado no meio do onboarding, antes do passo "primeira tarefa"**: ao retomar, o foco já
  respondido antes deve chegar como prop em `OnboardingStepPrimeiraTarefa` (não `null` por
  engano) — coberto por `useOnboarding.test.ts` (retomada já testada hoje; o teste precisa
  também afirmar o `foco` repassado).
- **Usuário que toca "Agora não" na `AtivacaoConviteScreen"` depois de já ter configurado
  regras de bloqueio** (voltou de `BloqueioApps` com algo salvo): "Agora não" não deve desfazer
  nada — como `AtivacaoConviteScreen` não lê nem grava regras de bloqueio, não há o que
  desfazer; coberto implicitamente por `AtivacaoConviteScreen.test.tsx` não chamar nenhuma
  função de `services/firestore`.
- **Dois `avancar()` em sequência rápida** (duplo toque) no mesmo passo do onboarding: não deve
  disparar `logOnboardingPassoConcluido` duas vezes para o mesmo passo — coberto por
  `useOnboarding.test.ts` (o guard `salvando` já existente bloqueia a segunda chamada; o teste
  novo confirma que o evento também não duplica).

---

## Task 1: Novos eventos de Analytics

**Files:**
- Modify: `src/services/analytics.ts`
- Test: `src/services/analytics.test.ts`

**Interfaces:**
- Produces: `logOnboardingPassoConcluido(passo: number): void`,
  `logOnboardingConcluido(criouPrimeiraTarefa: boolean): void` (assinatura nova — quebra o call
  site de `useOnboarding.ts`, corrigido na Task 2),
  `logAtivacaoBloqueioConvite(acao: 'configurar' | 'agora_nao'): void`.

- [ ] **Step 1: Atualizar o teste existente de `logOnboardingConcluido` e escrever os 2 testes novos**

```ts
test('logOnboardingConcluido envia se criou a primeira tarefa', () => {
  logOnboardingConcluido(true);
  expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'onboarding_concluido', {
    criouPrimeiraTarefa: true,
  });
});

test('logOnboardingPassoConcluido envia o índice do passo', () => {
  logOnboardingPassoConcluido(1);
  expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'onboarding_passo_concluido', {
    passo: 1,
  });
});

test('logAtivacaoBloqueioConvite envia a ação escolhida', () => {
  logAtivacaoBloqueioConvite('configurar');
  expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'ativacao_bloqueio_convite', {
    acao: 'configurar',
  });
});
```

- [ ] **Step 2: Rodar os testes pra confirmar que falham**

Run: `npx jest src/services/analytics.test.ts`
Expected: FAIL — `logOnboardingConcluido` chamado sem argumento não bate o novo `toHaveBeenCalledWith`; `logOnboardingPassoConcluido`/`logAtivacaoBloqueioConvite` não definidos.

- [ ] **Step 3: Implementar em `src/services/analytics.ts`**

Mudar a assinatura de `logOnboardingConcluido` para `(criouPrimeiraTarefa: boolean): void`,
repassando `{ criouPrimeiraTarefa }` pro `logEvent`. Adicionar as 2 funções novas acima do
mesmo jeito (uma função por evento, mesmo padrão do resto do arquivo).

- [ ] **Step 4: Rodar os testes pra confirmar que passam**

Run: `npx jest src/services/analytics.test.ts`
Expected: PASS, todos os testes do arquivo.

- [ ] **Step 5: Commit**

```bash
git add src/services/analytics.ts src/services/analytics.test.ts
git commit -m "feat: eventos de analytics por passo do onboarding e do convite de ativação"
```

---

## Task 2: `useOnboarding` dispara os eventos novos

**Files:**
- Modify: `src/hooks/useOnboarding.ts`
- Test: `src/hooks/useOnboarding.test.ts`

**Interfaces:**
- Consumes: `logOnboardingPassoConcluido(passo: number)`, `logOnboardingConcluido(criouPrimeiraTarefa: boolean)` (Task 1).

- [ ] **Step 1: Escrever os testes novos**

```ts
it('avancar() do passo foco dispara logOnboardingPassoConcluido(0)', async () => {
  // render do hook já no passo foco, com foco definido; chamar avancar()
  expect(logOnboardingPassoConcluido).toHaveBeenCalledWith(0);
});

it('comecarComTarefa chama logOnboardingConcluido(true)', async () => {
  expect(logOnboardingConcluido).toHaveBeenCalledWith(true);
});

it('pularPrimeiraTarefa chama logOnboardingConcluido(false)', async () => {
  expect(logOnboardingConcluido).toHaveBeenCalledWith(false);
});

it('dois avancar() em sequência no mesmo passo só disparam logOnboardingPassoConcluido uma vez', async () => {
  // chamar avancar() duas vezes sem esperar a primeira terminar
  expect(logOnboardingPassoConcluido).toHaveBeenCalledTimes(1);
});
```

(Seguir o padrão de mock já usado no arquivo para `jest.mock('../services/analytics')` e para
renderizar/avançar o hook — ver testes existentes de `avancar()` no mesmo arquivo.)

- [ ] **Step 2: Rodar pra confirmar que falham**

Run: `npx jest src/hooks/useOnboarding.test.ts`
Expected: FAIL nos 4 testes novos — `logOnboardingPassoConcluido` não é chamado;
`logOnboardingConcluido` é chamado sem argumento.

- [ ] **Step 3: Implementar em `src/hooks/useOnboarding.ts`**

Em `avancar()` (linhas ~106-131), chamar `logOnboardingPassoConcluido(passo)` logo depois de
cada `await progresso.salvar*(...)` bem-sucedido (foco=0, tempoTela=1, porque=2), antes do
`setPasso`. Em `concluirOnboarding()` (linhas ~136-147), trocar a chamada atual por
`logOnboardingConcluido(criouPrimeiraTarefa)`, recebendo esse booleano como parâmetro novo da
própria função — `comecarComTarefa` chama `concluirOnboarding(true)`, `pularPrimeiraTarefa`
chama `concluirOnboarding(false)`.

- [ ] **Step 4: Rodar pra confirmar que passam**

Run: `npx jest src/hooks/useOnboarding.test.ts`
Expected: PASS, todos os testes do arquivo.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useOnboarding.ts src/hooks/useOnboarding.test.ts
git commit -m "feat: useOnboarding dispara analytics por passo e diferencia pular de criar tarefa"
```

---

## Task 3: `OnboardingStepPrimeiraTarefa` com a linguagem e sugestões da HU-07

**Files:**
- Modify: `src/components/onboarding/OnboardingStepPrimeiraTarefa.tsx`
- Test: `src/components/onboarding/OnboardingStepPrimeiraTarefa.test.tsx` (criar)

**Interfaces:**
- Consumes: `SUGESTOES_ALTERNATIVAS: string[]` de `domain/sugestoesAlternativas.ts` (já existe).
- Produces: prop nova `foco: FocoProcrastinacao | null` em `OnboardingStepPrimeiraTarefaProps`
  (consumida pela Task 4).

- [ ] **Step 1: Escrever os testes**

```tsx
it('com foco redes_sociais, mostra o headline e os chips da HU-07', () => {
  render(<OnboardingStepPrimeiraTarefa valor="" onAlterar={jest.fn()} foco="redes_sociais" />);
  expect(screen.getByText('O que você vai fazer no lugar da rolagem hoje?')).toBeTruthy();
  expect(screen.getByText('Ler 10 páginas')).toBeTruthy();
  expect(screen.getByText('Caminhar 15 min')).toBeTruthy();
  expect(screen.getByText('Alongar 5 min')).toBeTruthy();
  expect(screen.getByText('Arrumar a mesa')).toBeTruthy();
});

it('tocar um chip chama onAlterar com o texto do chip', () => {
  const onAlterar = jest.fn();
  render(<OnboardingStepPrimeiraTarefa valor="" onAlterar={onAlterar} foco="redes_sociais" />);
  fireEvent.press(screen.getByText('Ler 10 páginas'));
  expect(onAlterar).toHaveBeenCalledWith('Ler 10 páginas');
});

it.each(['estudos', 'trabalho', 'organizacao_pessoal', 'outro', null] as const)(
  'com foco %s, não mostra os chips nem o headline de rolagem',
  foco => {
    render(<OnboardingStepPrimeiraTarefa valor="" onAlterar={jest.fn()} foco={foco} />);
    expect(screen.queryByText('Ler 10 páginas')).toBeNull();
    expect(
      screen.queryByText('O que você vai fazer no lugar da rolagem hoje?'),
    ).toBeNull();
  },
);
```

- [ ] **Step 2: Rodar pra confirmar que falham**

Run: `npx jest src/components/onboarding/OnboardingStepPrimeiraTarefa.test.tsx`
Expected: FAIL — prop `foco` não existe, headline/chips não existem ainda.

- [ ] **Step 3: Implementar**

Adicionar `foco: FocoProcrastinacao | null` a `OnboardingStepPrimeiraTarefaProps` (importar o
tipo de `../../domain/types`). Quando `foco === 'redes_sociais'`: título
`"O que você vai fazer no lugar da rolagem hoje?"`, descrição mantém o espírito atual ("Escolha
1 coisa simples que você consegue terminar hoje em menos de 10 minutos."), `TextInput` com
`placeholder="O que você faria em vez de abrir o feed?"`, e abaixo do campo uma `View` com um
`Pressable`/`Text` por item de `SUGESTOES_ALTERNATIVAS` (importado de
`../../domain/sugestoesAlternativas`), `onPress={() => onAlterar(sugestao)}` — mesmo
comportamento de toque único do `Chip` já usado no `TravadoFlow`, reaproveitando o componente
`../../components/intercept/Chip` em vez de recriar o estilo. Qualquer outro valor de `foco`
(incluindo `null`): mantém título, descrição e placeholder exatamente como estão hoje, sem
chips.

- [ ] **Step 4: Rodar pra confirmar que passam**

Run: `npx jest src/components/onboarding/OnboardingStepPrimeiraTarefa.test.tsx`
Expected: PASS, todos os testes.

- [ ] **Step 5: Commit**

```bash
git add src/components/onboarding/OnboardingStepPrimeiraTarefa.tsx src/components/onboarding/OnboardingStepPrimeiraTarefa.test.tsx
git commit -m "feat: primeira tarefa do onboarding usa a linguagem e sugestões da HU-07"
```

---

## Task 4: `OnboardingScreen` repassa o foco

**Files:**
- Modify: `src/screens/OnboardingScreen.tsx`
- Test: `src/screens/OnboardingScreen.test.tsx`

**Interfaces:**
- Consumes: prop `foco` de `OnboardingStepPrimeiraTarefa` (Task 3).

- [ ] **Step 1: Escrever o teste**

```tsx
it('passo primeira tarefa: repassa dados.focoProcrastinacao pra OnboardingStepPrimeiraTarefa', () => {
  // useOnboarding mockado retornando passo = PASSO_ONBOARDING.primeiraTarefa e
  // dados.focoProcrastinacao = 'redes_sociais'
  render(<OnboardingScreen uid="uid-1" onConcluir={jest.fn()} />);
  expect(screen.getByText('O que você vai fazer no lugar da rolagem hoje?')).toBeTruthy();
});
```

(Seguir o padrão de mock de `useOnboarding` já usado neste arquivo de teste, se existir; senão,
mockar `../hooks/useOnboarding` com `jest.mock`.)

- [ ] **Step 2: Rodar pra confirmar que falha**

Run: `npx jest src/screens/OnboardingScreen.test.tsx`
Expected: FAIL — `OnboardingStepPrimeiraTarefa` renderizado sem `foco`, chips/headline HU-07 não
aparecem.

- [ ] **Step 3: Implementar**

Em `OnboardingScreen.tsx`, no bloco `{passo === PASSO_ONBOARDING.primeiraTarefa && (...)}`,
adicionar `foco={dados.focoProcrastinacao}` à `OnboardingStepPrimeiraTarefa`.

- [ ] **Step 4: Rodar pra confirmar que passa**

Run: `npx jest src/screens/OnboardingScreen.test.tsx`
Expected: PASS, todos os testes do arquivo.

- [ ] **Step 5: Commit**

```bash
git add src/screens/OnboardingScreen.tsx src/screens/OnboardingScreen.test.tsx
git commit -m "feat: OnboardingScreen repassa o foco pra tela de primeira tarefa"
```

---

## Task 5: Texto do tutorial situa o mecanismo real antes do onboarding

**Files:**
- Modify: `src/screens/tutorial/TutorialScreen.tsx`
- Test: `src/screens/tutorial/TutorialScreen.test.tsx`

- [ ] **Step 1: Escrever/atualizar o teste do último slide**

```tsx
it('último slide situa o bloqueio das redes antes do onboarding', () => {
  render(<TutorialScreen onConcluir={jest.fn()} />);
  // navegar até passo 3, como os testes existentes já fazem
  expect(
    screen.getByText(
      'Antes de tudo, queremos entender o que mais pesa pra você hoje. Mais adiante, você configura o bloqueio das redes que mais tiram seu foco. Leva menos de 2 minutos.',
    ),
  ).toBeTruthy();
});
```

Se já existir um teste afirmando o texto antigo desse rodapé, atualizá-lo em vez de duplicar.

- [ ] **Step 2: Rodar pra confirmar que falha**

Run: `npx jest src/screens/tutorial/TutorialScreen.test.tsx`
Expected: FAIL — texto antigo ainda no lugar.

- [ ] **Step 3: Implementar**

Em `TutorialScreen.tsx`, trocar o `rodape` do bloco `passo === 3` (hoje "Antes de tudo, queremos
entender o que mais pesa pra você hoje. Leva menos de 2 minutos.") pelo texto do teste acima.
Nenhuma outra mudança nesse arquivo — os 3 slides anteriores ficam como estão.

- [ ] **Step 4: Rodar pra confirmar que passa**

Run: `npx jest src/screens/tutorial/TutorialScreen.test.tsx`
Expected: PASS, todos os testes do arquivo.

- [ ] **Step 5: Commit**

```bash
git add src/screens/tutorial/TutorialScreen.tsx src/screens/tutorial/TutorialScreen.test.tsx
git commit -m "docs: tutorial situa o bloqueio das redes antes do onboarding"
```

---

## Task 6: `useAtivacaoBloqueio` — gate da tela de ativação

**Files:**
- Modify: `src/utils/storage.ts`
- Create: `src/hooks/useAtivacaoBloqueio.ts`
- Test: `src/hooks/useAtivacaoBloqueio.test.ts`

**Interfaces:**
- Produces: `useAtivacaoBloqueio(uid: string | null, pronto: boolean): { deveExibirAtivacao: boolean; concluirAtivacao: () => Promise<void> }` (consumida pela Task 9).
- Produces: `STORAGE_KEYS.ativacaoBloqueioMostrada = 'ativacao_bloqueio_mostrada'`.

- [ ] **Step 1: Escrever os testes (molde de `useLocalNotifications.test.ts`)**

```ts
it('pronto=true e sem a flag gravada: deveExibirAtivacao começa true', async () => {
  const { result } = await renderHook(() => useAtivacaoBloqueio('uid-1', true));
  await waitFor(() => expect(result.current.deveExibirAtivacao).toBe(true));
});

it('pronto=false: deveExibirAtivacao nunca vira true', async () => {
  const { result } = await renderHook(() => useAtivacaoBloqueio('uid-1', false));
  await waitFor(() => expect(result.current.deveExibirAtivacao).toBe(false));
});

it('com a flag já gravada: deveExibirAtivacao começa false', async () => {
  await AsyncStorage.setItem(
    'ativacao_bloqueio_mostrada',
    JSON.stringify(true),
  );
  const { result } = await renderHook(() => useAtivacaoBloqueio('uid-1', true));
  await waitFor(() => expect(result.current.deveExibirAtivacao).toBe(false));
});

it('concluirAtivacao grava a flag e vira false', async () => {
  const { result } = await renderHook(() => useAtivacaoBloqueio('uid-1', true));
  await waitFor(() => expect(result.current.deveExibirAtivacao).toBe(true));
  await act(() => result.current.concluirAtivacao());
  expect(result.current.deveExibirAtivacao).toBe(false);
  expect(
    JSON.parse((await AsyncStorage.getItem('ativacao_bloqueio_mostrada'))!),
  ).toBe(true);
});
```

- [ ] **Step 2: Rodar pra confirmar que falham**

Run: `npx jest src/hooks/useAtivacaoBloqueio.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Adicionar `ativacaoBloqueioMostrada: 'ativacao_bloqueio_mostrada'` a `STORAGE_KEYS` em
`src/utils/storage.ts`. Criar `useAtivacaoBloqueio.ts` no mesmo molde de
`useLocalNotifications.ts`: `useEffect` dependente de `[pronto, uid]` que, se `pronto` e a flag
ainda não gravada, seta `deveExibirAtivacao = true`; `concluirAtivacao` grava a flag via
`salvarItem(STORAGE_KEYS.ativacaoBloqueioMostrada, true)` e seta `deveExibirAtivacao = false`.
Sem try/catch (mesmo padrão de `concluirPriming`).

- [ ] **Step 4: Rodar pra confirmar que passam**

Run: `npx jest src/hooks/useAtivacaoBloqueio.test.ts`
Expected: PASS, todos os testes.

- [ ] **Step 5: Commit**

```bash
git add src/utils/storage.ts src/hooks/useAtivacaoBloqueio.ts src/hooks/useAtivacaoBloqueio.test.ts
git commit -m "feat: hook de gate pra tela de ativação do bloqueio"
```

---

## Task 7: `AtivacaoConviteScreen`

**Files:**
- Create: `src/screens/ativacao/AtivacaoConviteScreen.tsx`
- Test: `src/screens/ativacao/AtivacaoConviteScreen.test.tsx`

**Interfaces:**
- Consumes: `logAtivacaoBloqueioConvite(acao: 'configurar' | 'agora_nao')` (Task 1).
- Produces: `AtivacaoConviteScreen({ aoConfigurar: () => void; aoPular: () => void })` (consumida
  pela Task 8).

- [ ] **Step 1: Escrever os testes**

```tsx
it('"Configurar bloqueio" chama aoConfigurar e loga configurar', () => {
  const aoConfigurar = jest.fn();
  render(<AtivacaoConviteScreen aoConfigurar={aoConfigurar} aoPular={jest.fn()} />);
  fireEvent.press(screen.getByText('Configurar bloqueio'));
  expect(aoConfigurar).toHaveBeenCalled();
  expect(logAtivacaoBloqueioConvite).toHaveBeenCalledWith('configurar');
});

it('"Agora não" chama aoPular e loga agora_nao', () => {
  const aoPular = jest.fn();
  render(<AtivacaoConviteScreen aoConfigurar={jest.fn()} aoPular={aoPular} />);
  fireEvent.press(screen.getByText('Agora não'));
  expect(aoPular).toHaveBeenCalled();
  expect(logAtivacaoBloqueioConvite).toHaveBeenCalledWith('agora_nao');
});
```

- [ ] **Step 2: Rodar pra confirmar que falham**

Run: `npx jest src/screens/ativacao/AtivacaoConviteScreen.test.tsx`
Expected: FAIL — arquivo não existe.

- [ ] **Step 3: Implementar**

Componente burro: título + descrição curta (texto definido na implementação, seguindo as regras
de copy — sem "!", sem cobrança) + `PrimaryButton` "Configurar bloqueio" (chama
`logAtivacaoBloqueioConvite('configurar')` e depois `aoConfigurar()`) + `SecondaryButton` "Agora
não" (chama `logAtivacaoBloqueioConvite('agora_nao')` e depois `aoPular()`). Mesmo padrão visual
de `theme/` dos outros componentes de onboarding/permissão.

- [ ] **Step 4: Rodar pra confirmar que passam**

Run: `npx jest src/screens/ativacao/AtivacaoConviteScreen.test.tsx`
Expected: PASS, todos os testes.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ativacao/AtivacaoConviteScreen.tsx src/screens/ativacao/AtivacaoConviteScreen.test.tsx
git commit -m "feat: tela de convite pra ativação do bloqueio"
```

---

## Task 8: `AtivacaoStack`

**Files:**
- Create: `src/navigation/AtivacaoStack.tsx`

**Interfaces:**
- Consumes: `AtivacaoConviteScreen` (Task 7); `BloqueioAppsScreen`, `DivulgacaoAcessibilidadeScreen`, `DivulgacaoAcessoUsoScreen` (já existem, sem mudança).
- Produces: `AtivacaoStack({ uid: string; onConcluir: () => void })` (consumida pela Task 9).

Sem teste próprio — é só wiring de navegação, molde exato de `PerfilStack.tsx`, coberto
indiretamente pelo teste de `RootNavigator` da Task 9 (mesmo padrão: `PerfilStack.tsx` também não
tem teste próprio neste repo).

- [ ] **Step 1: Implementar**

```ts
export type AtivacaoStackParamList = {
  AtivacaoConvite: undefined;
  BloqueioApps: undefined;
  DivulgacaoAcessibilidade: undefined;
  DivulgacaoAcessoUso: undefined;
};
```

`headerShown: false`. `AtivacaoConvite`: `aoConfigurar={() => navigation.navigate('BloqueioApps')}`,
`aoPular={onConcluir}`. `BloqueioApps`: mesmas props de `PerfilStack` exceto `aoAbrirRotina`
(omitido) e `onVoltar={() => navigation.goBack()}`. `DivulgacaoAcessibilidade`/
`DivulgacaoAcessoUso`: mesmas props de `PerfilStack` (`uid`, `onVoltar={() => navigation.goBack()}`).

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erro novo.

- [ ] **Step 3: Commit**

```bash
git add src/navigation/AtivacaoStack.tsx
git commit -m "feat: stack de ativação do bloqueio reaproveitando as telas existentes"
```

---

## Task 9: `RootNavigator` — novo ramo de ativação

**Files:**
- Modify: `src/navigation/RootNavigator.tsx`
- Test: `src/navigation/RootNavigator.test.tsx`

**Interfaces:**
- Consumes: `useAtivacaoBloqueio` (Task 6), `AtivacaoStack` (Task 8).

- [ ] **Step 1: Escrever os testes novos (molde do describe `'priming de notificação'`)**

```tsx
describe('ativação do bloqueio', () => {
  it('deveExibirAtivacao true: mostra a AtivacaoStack antes do priming/Main', async () => {
    useAtivacaoBloqueio.mockReturnValue({
      deveExibirAtivacao: true,
      concluirAtivacao: jest.fn(),
    });
    // onboarding completo, deveExibirPriming true também — AtivacaoStack deve
    // aparecer, não NotificationPriming nem Main
  });

  it('deveExibirAtivacao false: comportamento de priming/Main fica como está', async () => {
    useAtivacaoBloqueio.mockReturnValue({
      deveExibirAtivacao: false,
      concluirAtivacao: jest.fn(),
    });
    // mesmo teste já existente de priming/Main continua valendo
  });

  it('usuário que já tinha onboardingConcluido antes desta mudança também vê a AtivacaoStack uma vez', async () => {
    // onboarding.completo = true (como quem já concluiu há meses),
    // useAtivacaoBloqueio sem a flag → deveExibirAtivacao true
  });
});
```

- [ ] **Step 2: Rodar pra confirmar que falham**

Run: `npx jest src/navigation/RootNavigator.test.tsx`
Expected: FAIL — `useAtivacaoBloqueio` não mockado/usado ainda, `AtivacaoStack` não renderiza.

- [ ] **Step 3: Implementar**

Importar `useAtivacaoBloqueio` e `AtivacaoStack`. Chamar
`const ativacao = useAtivacaoBloqueio(auth.user?.uid ?? null, !!auth.user && onboarding.completo);`
(mesma condição `pronto` de `notificacoes`, linha ~47-50). No JSX, dentro do ramo
`onboarding.completo ? (...)`, envolver a lógica atual de `notificacoes.deveExibirPriming` com
`ativacao.deveExibirAtivacao ? <Stack.Screen name="Ativacao">{() => <AtivacaoStack uid={auth.user!.uid} onConcluir={ativacao.concluirAtivacao} />}</Stack.Screen> : (...)`.
Adicionar `Ativacao: undefined;` a `RootStackParamList`.

- [ ] **Step 4: Rodar pra confirmar que passam**

Run: `npx jest src/navigation/RootNavigator.test.tsx`
Expected: PASS, todos os testes do arquivo (existentes + novos).

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npx jest`
Expected: todos os testes passam, nenhuma regressão.

- [ ] **Step 6: Commit**

```bash
git add src/navigation/RootNavigator.tsx src/navigation/RootNavigator.test.tsx
git commit -m "feat: RootNavigator mostra o convite de ativação do bloqueio pós-onboarding"
```

---

## Task 10: Documentação

**Files:**
- Modify: `docs/projeto/regras-de-negocio.md`
- Modify: `docs/projeto/arquitetura.md`

- [ ] **Step 1: Atualizar `regras-de-negocio.md`**

Na seção de onboarding (buscar onde o passo "primeira tarefa" é descrito, se já documentado;
senão, acrescentar): documentar os chips condicionais a `foco === 'redes_sociais'` com os textos
exatos implementados nas Tasks 3-5. Nova subseção descrevendo a `AtivacaoConviteScreen` (textos
reais da Task 7) e quando ela aparece (gate `ativacao_bloqueio_mostrada`, inclusive pra quem já
tinha concluído o onboarding antes). Atualizar a lista de eventos de Analytics com os 3 novos da
Task 1 (sem parâmetro de texto livre).

- [ ] **Step 2: Atualizar `arquitetura.md`**

Linhas ~18-27: acrescentar `AtivacaoStack` à lista de telas do `RootNavigator` e ao gate
descrito (onboarding completo → ativação não vista → priming de notificação → Main). Linha ~94
(tabela de permissões): nota de que a ativação de Accessibility e acesso de uso agora também
tem esse ponto de entrada único pós-onboarding, além do já existente via Perfil.

- [ ] **Step 3: Commit**

```bash
git add docs/projeto/regras-de-negocio.md docs/projeto/arquitetura.md
git commit -m "docs: atualiza regras de negócio e arquitetura com o convite de ativação"
```
