# Arquitetura — Rootora

> Consolidado de `definition/arquitetura.md`, `definition/stack-tecnico.md`,
> `docs/adr/0001-coleta-uso-usagestatsmanager.md` e do `CLAUDE.md` da raiz (seções
> "Arquitetura real" e "Comandos"). ADRs completas continuam em `docs/adr/`.

## Tipo de solução

App mobile Android (iOS depois), cliente React Native com backend gerenciado no Firebase (sem
servidor próprio). Bloqueio de apps é feito em código nativo Kotlin via Accessibility Service,
que roda sem o JS ativo — por isso parte da lógica de negócio (saldo de blocos, rotina noturna)
existe em duplicado: Kotlin (autoridade) + TypeScript (referência testada), mantidas iguais só
pelas fixtures compartilhadas.

## Frontend

- **Framework:** React Native 0.87.0 (CLI 20.2.0, bare workflow, não Expo) com React 19.2.3
- **Linguagem:** TypeScript 6.0.3 (`strict: true`), sem `any` implícito
- **Navegação:** `@react-navigation/native` + `/native-stack` + `/bottom-tabs`.
  `RootNavigator` é um `Stack.Navigator` único (não stacks separados por arquivo):
  ```
  Splash → Tutorial → Auth (SignIn/SignUp/ForgotPassword) → Onboarding
    → NotificationPriming (uma vez) → Main
  Main → MainTabNavigator (Hoje / Progresso / Perfil)
  Interceptação de apps bloqueados: root RN separado ('Intercept', InterceptActivity nativa),
    fora do RootNavigator
  ```
  Onboarding é 1 tela com máquina de passos interna (Foco→TempoTela→Porque→PrimeiraTarefa); o
  gate de saída é `users/{uid}.onboardingConcluido` (não `porqueTexto`). Detalhe completo em
  `navegacao-componentes.md` (em `/definition`, ainda não migrado para `docs/projeto/`).
- **Animações:** `Animated` do core (Splash, Tutorial, LoadingIndicator) — `react-native-reanimated`
  não está instalado
- **Ícones:** `lucide-react-native`

## Backend (Firebase)

| Serviço | Uso |
|---|---|
| Firebase Auth | E-mail/senha + Google Sign-In (`@react-native-google-signin/google-signin`) |
| Cloud Firestore | Banco de dados principal — ver `schema.md` (projeto `raiz-app-71d02`) |
| Cloud Messaging (FCM) | Reservado para reengajamento futuro — **não usado hoje**, o app usa notificação local |
| Cloud Functions | **Ainda não usado.** Único uso planejado: verificação de assinatura via Google Play Developer API (ver `spec.md`, seção "Loja e publicação") — exige migração para o plano Blaze (pago) quando chegar lá |
| Firebase Analytics | Eventos custom de produto — wrapper `src/services/analytics.ts`, uma função por evento |
| Firebase Crashlytics | Relato de crash + `registrarErro` manual nos catches de `hooks/` — wrapper `src/services/crashlytics.ts` |

Notificações: locais via `@notifee/react-native`, não FCM — lembrete diário e alerta de risco de
streak dependem de horário/estado local, não de evento de servidor.

## Nativo (Android/Kotlin)

Bloqueio de apps e coleta de uso rodam em módulos Kotlin dedicados:

- `AccessibilityService` + `InterceptActivity` — intercepta app bloqueado, monta root RN
  separado (`AppRegistry.registerComponent('Intercept', ...)`)
- `SaldoBloqueioMaquina.kt` — autoridade da máquina de estados de sessão/cooldown, roda sem JS;
  espelha `domain/saldoBloqueio.ts`, mesmas fixtures (`domain/__fixtures__/saldoBloqueio.json`)
- `RootoraUsoAppsModule.kt` — lê eventos do `UsageStatsManager` (permissão especial
  `PACKAGE_USAGE_STATS`, concedida manualmente nas configurações do Android). Decisão registrada
  em `docs/adr/0001-coleta-uso-usagestatsmanager.md`: essa é a única fonte que funciona com o
  Accessibility Service desligado — alternativas descartadas foram eventos do próprio
  Accessibility Service e coleta em segundo plano via WorkManager
- `AvisoDesligamentoPrefs.kt`/`AvisoDesligamentoAgendador.kt`/`AvisoDesligamentoReceiver.kt`/
  `AvisoDesligamentoBootReceiver.kt` — registram desligar/religar do Accessibility Service e
  agendam até 2 lembretes locais (`AlarmManager`, alarme inexato), sobrevivem a reboot
- `src/native/` (TS) — wrappers sobre os módulos nativos (`AccessibilityDetection.ts`,
  `UsoApps.ts`); sem o módulo linkado, resolvem vazio/false, nunca rejeitam

## Integrações externas

- **Google Play:** distribuição (teste fechado); verificação de assinatura via Cloud Function
  planejada, ainda não implementada
- **Firebase Hosting:** serve `docs/legal/` (Política de Privacidade, Termos de Uso) — config em
  `firebase.json`/`.firebaserc` na raiz do repo, projeto `raiz-app-71d02`

## Infra / ambiente de desenvolvimento

- WSL2 (Ubuntu) no Windows + Android Studio rodando no lado Windows (SDK/emulador)
- **Gradle sempre roda de dentro do WSL** (`npx react-native run-android`) — nunca pelo botão de
  sync do Android Studio quando o projeto vive no filesystem do WSL acessado via `\\wsl$`: causa
  `IOException: Incorrect function` (incompatibilidade de lock de arquivo no compartilhamento de
  rede)
- ADB roda do lado Windows; dispositivo físico conecta direto no Windows (USB ou depuração sem
  fio), sem passthrough para o WSL
- Pacote Android (`applicationId`/`namespace`): `com.luxthorapps.rootora`. Nome npm: `rootora`;
  componente registrado continua `raizApp` (`app.json`, `MainActivity`)
- `MainActivity` ignora `savedInstanceState` (`super.onCreate(null)`) — `react-native-screens`
  não suporta restauração de Fragments pelo Android; sem isso o app derruba com "Screen fragments
  should never be restored" (visto via Crashlytics em ColorOS). Não remover.

## Permissões Android relevantes

| Permissão | Tipo | Onde é pedida |
|---|---|---|
| Accessibility Service | Manual, via Configurações do sistema (sem diálogo nativo) | `DivulgacaoAcessibilidadeScreen`, ANTES de abrir as configurações |
| `PACKAGE_USAGE_STATS` | Especial, manual nas configurações do Android | `DivulgacaoAcessoUsoScreen` |
| Notificações (`POST_NOTIFICATIONS`, Android 13+) | Runtime, diálogo nativo | `NotificationPrimingScreen`, uma vez no primeiro boot pós-onboarding |

Não usamos `QUERY_ALL_PACKAGES` — a lista de apps da tela de bloqueio é resolvida via `<queries>`
no manifesto (`MAIN`/`LAUNCHER` para a lista curada), que não exige formulário de justificativa
na revisão manual da Play Store.

## Comandos

```bash
npm install                 # instalar dependências
npm start                   # Metro bundler
npm run android              # build + instala no emulador/dispositivo
npm run lint                  # ESLint
npm test                      # Jest + @testing-library/react-native
npx tsc --noEmit               # checagem de tipos
cd android && ./gradlew :app:testDebugUnitTest   # testes Kotlin (fora do npm test)
```

Formatador: Prettier 2.8.8 (`npx prettier --write .`).

Relatório de testes JS: `reports/junit/*.xml` (reporter `jest-junit`, ignorado pelo git).
Relatório Kotlin: `android/app/build/test-results/testDebugUnitTest/*.xml`.

## Dependências

| Pacote | Versão | Licença |
|---|---|---|
| react | 19.2.3 | MIT |
| react-native | 0.87.0 | MIT |
| @react-native-firebase/app, /auth, /firestore, /messaging, /analytics, /crashlytics | 26.4.0 | Apache-2.0 |
| @react-native-google-signin/google-signin | 16.1.5 | MIT |
| @react-navigation/native, /native-stack, /bottom-tabs | 7.3.18 / 7.18.10 / 7.18.18 | MIT |
| react-native-screens | 4.27.0 | MIT |
| react-native-safe-area-context | 5.9.0 | MIT |
| react-native-svg | 15.15.5 | MIT |
| @react-native-async-storage/async-storage | 3.1.1 | MIT |
| @notifee/react-native | 9.1.8 | Apache-2.0 |
| @react-native-community/datetimepicker | 9.2.1 | MIT |
| lucide-react-native | 1.43.0 | ISC |
| typescript | 6.0.3 | Apache-2.0 |
| jest, jest-junit, @testing-library/react-native, react-test-renderer | 29.7.0 / 17.0.0 / 14.0.1 / 19.2.3 | MIT / Apache-2.0 / MIT / MIT |
| eslint, prettier | 8.57.1 / 2.8.8 | MIT |
| firebase-admin | 14.3.0 | Apache-2.0 |
| react-native-iap (📋 planejado, ainda não instalado) | — | — |

Lista completa (incluindo dependências de build/CLI) em `definition/arquitetura.md`.

## Estrutura de pastas

```
src/
├── screens/       # Orquestram hooks + componentes, quase zero lógica própria
├── components/    # "Burros" — só recebem props, nunca chamam Firebase direto
├── hooks/         # Lógica de negócio (useStreak, useDailyTasks, useRegrasBloqueio...)
├── domain/        # Funções puras (streak.ts, progress.ts, appBlock.ts, intercept.ts...)
│   └── __fixtures__/  # fixtures compartilhadas TS/Kotlin (ex.: saldoBloqueio.json)
├── services/      # Única camada que fala com Firebase (firestore.ts, auth.ts, analytics.ts...)
├── native/        # Wrappers TS sobre módulos nativos Android (AccessibilityDetection.ts)
├── theme/         # colors.ts, typography.ts — ver design-system.md para os tokens
├── navigation/    # React Navigation
└── utils/         # Helpers genéricos

android/app/       # Kotlin: AccessibilityService, InterceptActivity, SaldoBloqueioMaquina.kt,
                    # RootoraUsoAppsModule.kt, AvisoDesligamento*.kt

docs/legal/        # Política de Privacidade e Termos (servidos via Firebase Hosting)
```

**Regra-chave:** `components/`/`screens/` nunca importam `services/` direto — só via `hooks/`.
`domain/` nunca importa React/Firebase/AsyncStorage. Regra de negócio nova vive em `domain/` e
precisa de teste.

## ADRs

| # | Decisão | Status |
|---|---|---|
| [0001](../adr/0001-coleta-uso-usagestatsmanager.md) | Coleta de uso das redes sociais via `UsageStatsManager` (não eventos do Accessibility Service, não WorkManager) | Aceita (2026-10-19) |

## Dívida técnica

| Item | Estado | Migração planejada |
|---|---|---|
| Cálculo de streak/escudo | Roda no client, ao abrir o app | Cloud Function agendada, quando a base crescer |
| `streakAtual`/`escudosDisponiveis` | Graváveis diretamente pelo client | Endurecer regras (só Cloud Function admin escreve) antes de escalar |
| Exclusão de conta | Client-side, sem exclusão recursiva via Admin SDK — lista de subcoleções é manual (`SUBCOLECOES_DO_USUARIO`), subcoleção nova esquecida fica órfã | Cloud Function, mesmo racional do item acima |
| Regra do saldo de blocos duplicada (Kotlin + TS) | Mantidas iguais só pelas fixtures compartilhadas | Aceito: o Service não tem JS. Mexer numa cópia exige mexer na outra + fixtures |
| Testes Kotlin | Fora do `npm test`, roda só via Gradle local | Incluir no CI quando houver |
| Estado do saldo de blocos | Só em SharedPreferences, sem backup/restauração nem sync (reinstalar zera o dia) | Aceito: o saldo vale um dia só |
| Verificação de assinatura | Feature não implementada ainda | Será Cloud Function desde o início, não dívida |

Ao editar `firestore.rules` ou campos de streak/assinatura, revisar esta seção antes.
