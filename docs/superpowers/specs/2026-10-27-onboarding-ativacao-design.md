# Revisão de onboarding, tutorial e ativação do bloqueio — Design

**Data:** 2026-10-27
**Status:** aprovado em brainstorming, pronto para plano de implementação.

## Contexto

O produto hoje é um bloqueador de redes sociais por Accessibility Service, com pausa de
intenção, sessões de foco e desafio de redução de tempo. O tutorial de slides e o onboarding de
4 passos nunca foram atualizados para refletir isso: vendem "tarefas pequenas contra
procrastinação" genérico, sem mencionar bloqueio, Accessibility, acesso de uso ou a alternativa à
rolagem (HU-07). Depois do onboarding, o usuário cai direto na Home sem nenhum convite a
configurar o bloqueio — o caminho até lá (aba Perfil → "Bloqueio de apps" → "Ativar" →
divulgação → configurações do Android) existe, mas só é alcançado por iniciativa própria.

## Achados da Fase 1 (análise, sem mudança de código)

1. Nenhum texto contraditório encontrado (sem "check-in", "escudo" na UI, missão/desafio pra
   destravar, conteúdo bíblico ou promessa neurológica) — o problema é ausência, não
   contradição: tutorial/onboarding/tour nunca mencionam bloqueio, Accessibility, redes sociais
   ou a pausa de intenção.
2. Caminho de ativação real: 4 a 6 toques, 4 telas, só alcançável entrando na aba Perfil por
   conta própria — nada no fim do onboarding leva lá.
3. `focoProcrastinacao` é gravado (`useOnboarding.ts`) e nunca lido em nenhuma decisão de produto
   hoje.
4. A "primeira tarefa" do onboarding não usa a linguagem de alternativa da HU-07, mas é criada
   para hoje com `essencial: true` — tecnicamente já elegível a aparecer na pausa de intenção
   (`escolherTarefaAlternativa`), por efeito colateral do mecanismo genérico, não por desenho.
5. Não há evento de Analytics por passo do onboarding; `logOnboardingConcluido()` dispara igual
   tanto ao criar a 1ª tarefa quanto ao pular — hoje não é possível medir desistência passo a
   passo.
6. Tutorial e onboarding cobrem o mesmo terreno emocional (ciclo da procrastinação, tarefas
   pequenas, proteção do streak) sem necessariamente ser redundante — decisão do Lucas: manter
   os dois.

## Decisões já tomadas (Lucas)

- `focoProcrastinacao`: passa a ser usado. Só personaliza a UI da "primeira tarefa" do
  onboarding (chips HU-07 vs. campo livre) — não muda schema, não vira critério de
  elegibilidade de nada além disso.
- Tutorial de slides continua existindo, separado do onboarding.
- Convite de ativação do bloqueio: tela própria pós-onboarding (não um 5º passo do wizard),
  espelhando o padrão já existente do `NotificationPrimingScreen`. Isso significa que a tela
  aparece uma vez também para quem **já** concluiu o onboarding antes desta mudança — mesmo
  comportamento que `NotificationPriming` já tem hoje para quem nunca viu aquela tela. Não é
  "refazer o onboarding": é uma tela nova, pulável, sem repetir nenhum passo já respondido.
- Textos das divulgações de Accessibility e de acesso de uso (`DivulgacaoAcessibilidadeScreen`,
  `DivulgacaoAcessoUsoScreen`) não mudam — mesmas telas, mesmo texto, mesma gravação de
  consentimento (exigência da Play Store).

## Escopo

- Reescrever o conteúdo do tutorial (texto) e dos 4 passos do onboarding.
- Passo "primeira tarefa" do onboarding ganha linguagem e sugestões da HU-07, condicionado ao
  foco escolhido.
- Nova tela de convite + stack de ativação pós-onboarding, reaproveitando
  `BloqueioAppsScreen`/`DivulgacaoAcessibilidadeScreen`/`DivulgacaoAcessoUsoScreen` como existem.
- Novos eventos de Analytics para medir progresso/desistência no onboarding e no convite de
  ativação.
- Atualizar `docs/projeto/regras-de-negocio.md` e `docs/projeto/arquitetura.md` no mesmo branch.

## Fora de escopo

- Tour de funcionalidades (`tourSteps.ts`) — não pedido, fica como está.
- Qualquer slide novo explicando pausa de intenção, desafio de redução, reflexão semanal ou
  válvulas de escape — elas se explicam no momento em que aparecem (regra do Lucas).
- Mudança de schema do Firestore — `focoProcrastinacao` continua com os mesmos 5 valores.
- Textos das divulgações de Accessibility/acesso de uso.
- Qualquer alteração que force um usuário que já concluiu o onboarding a refazer passos já
  respondidos.

## Seção A — Conteúdo do tutorial e do onboarding

**Tutorial (4 slides, mesma estrutura, texto revisado):** mantém a sequência ciclo da
procrastinação → tarefas pequenas → proteção do streak → "vamos começar". O rodapé do slide 3
(`TutorialScreen.tsx:110`, hoje só fala de proteção do streak) passa a situar o mecanismo real
(interceptação ao abrir redes sociais) antes do onboarding, sem entrar em sessão, cooldown ou
válvulas. Texto exato é decidido na implementação, seguindo as regras de copy do CLAUDE.md (sem
"!", sem cobrança, sem "check-in", sem promessa neurológica).

**Passo "Foco" (`OnboardingStepFoco.tsx`):** sem mudança — mantém os 5 chips de
`OPCOES_FOCO_PROCRASTINACAO`.

**Passo "Primeira Tarefa" (`OnboardingStepPrimeiraTarefa.tsx`):**
- Título/descrição trocam para a moldura da HU-07 (mesmo headline da Home: "O que você vai fazer
  no lugar da rolagem hoje?").
- Recebe uma prop nova, `foco: FocoProcrastinacao | null` (vem de `dados.focoProcrastinacao` em
  `useOnboarding.ts`/`OnboardingScreen.tsx`).
- Se `foco === 'redes_sociais'`: mostra os chips de `domain/sugestoesAlternativas.ts`
  (`SUGESTOES_ALTERNATIVAS` — "Ler 10 páginas", "Caminhar 15 min", "Alongar 5 min", "Arrumar a
  mesa"), mesmo padrão visual/comportamental do `AddTaskForm` (tocar só preenche o campo).
- Qualquer outro valor de `foco` (incluindo `null`): mantém só o campo de texto livre, sem a
  moldura de rolagem nem os chips — placeholder genérico como hoje.
- Continua um componente burro (só título/descrição/chips/campo); nenhuma lógica de Firestore ou
  Accessibility aqui.
- Sem mudança em `domain/onboarding.ts` (passos, validação, `passoInicialOnboarding`) nem no
  schema do Firestore.

## Seção B — Tela e stack de ativação do bloqueio

**`src/utils/storage.ts`:** nova chave `ativacaoBloqueioMostrada: 'ativacao_bloqueio_mostrada'`.

**Novo hook `useAtivacaoBloqueio(uid: string | null, pronto: boolean)`**
(`src/hooks/useAtivacaoBloqueio.ts`, mesmo molde de `useLocalNotifications`'s
`deveExibirPriming`/`concluirPriming`): retorna
`{ deveExibirAtivacao: boolean; concluirAtivacao: () => Promise<void> }`.
- `pronto` é a mesma condição que já gate-ia `NotificationPriming`: `onboarding.completo`.
- Sem a flag gravada em AsyncStorage e `pronto === true` → `deveExibirAtivacao = true`.
- `concluirAtivacao` grava a flag e muda o estado para `false`. Não chama nenhuma permissão
  nativa — isso já acontece dentro das telas de divulgação reaproveitadas.
- Sem try/catch ao redor de `salvarItem` — mesmo padrão de `concluirPriming` hoje.

**`RootNavigator.tsx`:** novo ramo entre `onboarding.completo` e o `NotificationPriming` atual:

```
onboarding.completo ? (
  ativacao.deveExibirAtivacao ? (
    <AtivacaoStack uid={auth.user!.uid} onConcluir={ativacao.concluirAtivacao} />
  ) : notificacoes.deveExibirPriming ? (
    <NotificationPriming ... />
  ) : (
    <Main ... />
  )
) : (
  <Onboarding ... />
)
```

**Novo `src/navigation/AtivacaoStack.tsx`** (molde de `PerfilStack.tsx`, `headerShown: false`):

```ts
export type AtivacaoStackParamList = {
  AtivacaoConvite: undefined;
  BloqueioApps: undefined;
  DivulgacaoAcessibilidade: undefined;
  DivulgacaoAcessoUso: undefined;
};
```

- `AtivacaoConvite` → nova `AtivacaoConviteScreen`.
- `BloqueioApps`/`DivulgacaoAcessibilidade`/`DivulgacaoAcessoUso` → as 3 telas existentes,
  reaproveitadas sem mudar texto nem lógica interna. `BloqueioAppsScreen` aqui recebe
  `aoAbrirRotina` omitido (sem rotina configurada ainda neste ponto do fluxo) e
  `onVoltar={() => navigation.goBack()}` (volta para `AtivacaoConvite`, mesmo padrão de hoje).

**Nova `AtivacaoConviteScreen`** (`src/screens/ativacao/AtivacaoConviteScreen.tsx`): componente
burro, props `{ aoConfigurar: () => void; aoPular: () => void }`. Sempre 2 botões, nas mesmas
condições, mesmo que o usuário já tenha voltado aqui depois de configurar algo:
- "Configurar bloqueio" (primário) → navega para `BloqueioApps`.
- "Agora não" (secundário) → chama `aoPular` (= `onConcluir` do stack = `concluirAtivacao`).
- "Agora não" nunca desfaz o que já foi salvo — só fecha o convite.

## Seção C — Analytics

**`logOnboardingPassoConcluido(passo: number)`** (nova): disparada em
`useOnboarding.ts:avancar()`, logo depois de salvar cada passo (foco=0, tempoTela=1, porque=2) —
dá o funil passo a passo.

**`logOnboardingConcluido()` ganha parâmetro:**
`logOnboardingConcluido(criouPrimeiraTarefa: boolean)` — chamada de `comecarComTarefa` (`true`) e
`pularPrimeiraTarefa` (`false`) dentro de `concluirOnboarding()`. Atualiza o único call site e o
teste existente em `analytics.test.ts`.

**`logAtivacaoBloqueioConvite(acao: 'configurar' | 'agora_nao')`** (nova): disparada pelos 2
botões da `AtivacaoConviteScreen`.

Nenhum evento leva texto digitado (porquê, título da tarefa) — só índice, booleano ou enum fixo,
mesmo padrão do resto de `services/analytics.ts`. Sem evento novo no tour de funcionalidades nem
parâmetro novo nos eventos de permissão já existentes (fora de escopo).

## Seção D — Testes, erros, documentação

**Testes:**
- `OnboardingStepPrimeiraTarefa.test.tsx`: chips HU-07 só com `foco === 'redes_sociais'`; tocar
  um chip preenche o campo; outro foco (ou `null`) não mostra chips.
- `useOnboarding.test.ts`: `logOnboardingPassoConcluido` chamado com o índice certo em cada
  `avancar()`; `comecarComTarefa`/`pularPrimeiraTarefa` chamam `logOnboardingConcluido(true)` e
  `logOnboardingConcluido(false)` respectivamente.
- Novo `useAtivacaoBloqueio.test.ts` (molde de `useLocalNotifications.test.ts`):
  `deveExibirAtivacao` é `true` sem a flag gravada e com `pronto`; `concluirAtivacao` grava a
  flag e muda o estado para `false`.
- Novo `AtivacaoConviteScreen.test.tsx`: "Configurar bloqueio" chama `aoConfigurar` e dispara
  `logAtivacaoBloqueioConvite('configurar')`; "Agora não" chama `aoPular` e dispara
  `logAtivacaoBloqueioConvite('agora_nao')`.
- `RootNavigator.test.tsx` (já existe): novo caso cobrindo
  `onboarding.completo && ativacao.deveExibirAtivacao` renderizando `AtivacaoStack` antes de
  `NotificationPriming`/`Main`.
- `analytics.test.ts`: atualiza o teste de `logOnboardingConcluido` para o novo parâmetro; novos
  testes para os 2 eventos novos.

**Tratamento de erro:** nenhum padrão novo — `concluirAtivacao` segue o mesmo comportamento de
`concluirPriming` (sem try/catch ao redor do `salvarItem`).

**Documentação (mesmo branch, antes do merge):**
- `docs/projeto/regras-de-negocio.md`: nova subseção descrevendo o convite de ativação (textos
  reais, escritos na implementação) + atualização da seção de onboarding com os chips
  condicionais + atualização da lista de eventos de Analytics.
- `docs/projeto/arquitetura.md:18-27`: adiciona `AtivacaoStack` à lista de telas do
  `RootNavigator` e ao gate descrito; linha ~94 (tabela de permissões) ganha nota sobre esse novo
  ponto de superfície pré-`Main`.
- `docs/projeto/schema.md`: sem mudança — o gate da ativação é só AsyncStorage, nenhum campo novo
  no Firestore.

## Restrições globais

- Onboarding continua com 4 passos — nenhum passo novo adicionado ao wizard.
- Sem ponto de exclamação, sem "check-in", sem "proteção" fora do streak, sem promessa
  neurológica, em qualquer texto novo.
- Textos das divulgações de Accessibility e de acesso de uso são imutáveis nesta tarefa.
- Nenhuma mudança de schema do Firestore (`focoProcrastinacao` mantém os 5 valores atuais).
- Nenhum usuário que já concluiu o onboarding é levado a refazer um passo já respondido — a nova
  tela de ativação é adicional e sempre pulável, nunca um passo do onboarding em si.
