# Arquitetura e stack

## Tipo de solução
App mobile Android (iOS depois), cliente React Native com backend gerenciado no Firebase (sem servidor próprio). Bloqueio de apps feito em código nativo Kotlin via Accessibility Service, que roda sem o JS ativo.

## Stack
- Linguagem: TypeScript 6.0.3 (`strict: true`)
- Linguagem nativa: Kotlin (Accessibility Service, `InterceptActivity`, `SaldoBloqueioMaquina.kt`)
- Framework: React Native 0.87.0 (CLI 20.2.0, bare workflow, não Expo) com React 19.2.3
- Backend: Firebase (Auth, Firestore, Analytics, Crashlytics) via `@react-native-firebase`
- Ambiente: WSL2 (Ubuntu) + Android Studio no Windows; Gradle sempre pelo terminal WSL

## Comandos
- Instalar: `npm install`
- Testar: `npm test` (Jest + @testing-library/react-native); testes Kotlin à parte: `cd android && ./gradlew :app:testDebugUnitTest`
- Lint: `npm run lint`
- Tipos: `npx tsc --noEmit`

## Relatório de testes
- Formato: JUnit XML
- Caminho: `reports/junit/*.xml` (reporter `jest-junit`, `outputDirectory: 'reports/junit'` na config do Jest)
- Caminho dos testes Kotlin (padrão do Gradle): `android/app/build/test-results/testDebugUnitTest/*.xml`

## Formatador
Prettier 2.8.8 (`npx prettier --write .`)

## Serviços externos
- Firebase Auth: login por e-mail/senha e Google Sign-In
- Cloud Firestore: banco principal (projeto `raiz-app-71d02`)
- Firebase Analytics: eventos de produto (wrapper `src/services/analytics.ts`)
- Firebase Crashlytics: crashes e erros registrados manualmente (wrapper `src/services/crashlytics.ts`)
- Google Play: distribuição (teste fechado); verificação de assinatura via Cloud Function planejada, ainda não implementada

## Dependências
- react@19.2.3 (MIT)
- react-native@0.87.0 (MIT)
- @react-native-firebase/app@26.4.0 (Apache-2.0)
- @react-native-firebase/auth@26.4.0 (Apache-2.0)
- @react-native-firebase/firestore@26.4.0 (Apache-2.0)
- @react-native-firebase/messaging@26.4.0 (Apache-2.0)
- @react-native-firebase/analytics@26.4.0 (Apache-2.0)
- @react-native-firebase/crashlytics@26.4.0 (Apache-2.0)
- @react-native-google-signin/google-signin@16.1.5 (MIT)
- @react-navigation/native@7.3.18 (MIT)
- @react-navigation/native-stack@7.18.10 (MIT)
- @react-navigation/bottom-tabs@7.18.18 (MIT)
- react-native-screens@4.27.0 (MIT)
- react-native-safe-area-context@5.9.0 (MIT)
- react-native-svg@15.15.5 (MIT)
- @react-native-async-storage/async-storage@3.1.1 (MIT)
- @notifee/react-native@9.1.8 (Apache-2.0)
- @react-native-community/datetimepicker@9.2.1 (MIT)
- lucide-react-native@1.43.0 (ISC)
- @react-native-community/cli@20.2.0 (MIT)
- @react-native-community/cli-platform-android@20.2.0 (MIT)
- @react-native-community/cli-platform-ios@20.2.0 (MIT)
- @react-native/babel-preset@0.87.0 (MIT)
- @react-native/eslint-config@0.87.0 (MIT)
- @react-native/jest-preset@0.87.0 (MIT)
- @react-native/metro-config@0.87.0 (MIT)
- @react-native/new-app-screen@0.87.0 (MIT)
- @react-native/typescript-config@0.87.0 (MIT)
- @babel/core@7.29.7 (MIT)
- @babel/preset-env@7.29.7 (MIT)
- @babel/runtime@7.29.7 (MIT)
- typescript@6.0.3 (Apache-2.0)
- jest@29.7.0 (MIT)
- jest-junit@17.0.0 (Apache-2.0)
- @testing-library/react-native@14.0.1 (MIT)
- react-test-renderer@19.2.3 (MIT)
- @types/jest@29.5.14 (MIT)
- @types/react@19.2.18 (MIT)
- @types/react-test-renderer@19.1.0 (MIT)
- eslint@8.57.1 (MIT)
- prettier@2.8.8 (MIT)
- firebase-admin@14.3.0 (Apache-2.0)

## Estrutura de pastas
```text
src/
  screens/     # orquestram hooks e componentes; nunca importam services/
  components/  # "burros", só props; nunca importam services/
  hooks/       # lógica de negócio e acesso a dados via services/
  domain/      # funções puras, sem React/Firebase; regra nova exige teste
    __fixtures__/  # fixtures compartilhadas TS/Kotlin (ex.: saldoBloqueio.json)
  services/    # única camada que fala com Firebase (analytics, crashlytics, firestore)
  theme/       # cores e fontes; nada hardcoded fora daqui
android/
  app/         # Kotlin: AccessibilityService, InterceptActivity, SaldoBloqueioMaquina.kt (autoridade do saldo, espelha domain/saldoBloqueio.ts), RootoraUsoAppsModule.kt (lê eventos do UsageStatsManager; permissão PACKAGE_USAGE_STATS, "Acesso de uso" concedido pelo usuário nas configurações)
               # Aviso de bloqueio desligado (HU-03): AvisoDesligamentoPrefs.kt registra os eventos de desligar/religar do serviço (SharedPreferences, funciona com o app fechado); AvisoDesligamentoAgendador.kt agenda até 2 lembretes com AlarmManager (alarme INEXATO, setAndAllowWhileIdle, sem SCHEDULE_EXACT_ALARM); AvisoDesligamentoReceiver.kt decide (AvisoDesligamentoMaquina.kt, espelha domain/avisoBloqueio.ts) e exibe a notificação no canal "lembretes-rootora", o mesmo do notifee; AvisoDesligamentoBootReceiver.kt reagenda no boot (RECEIVE_BOOT_COMPLETED)
native/ (src/)  # wrappers TS dos módulos nativos (AccessibilityDetection.ts, UsoApps.ts); sem o módulo linkado resolvem vazio/false, nunca rejeitam
docs/
  legal/       # Política de Privacidade e Termos (Firebase Hosting)
```
