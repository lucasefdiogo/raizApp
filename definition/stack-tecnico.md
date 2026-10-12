# Stack Técnico — Rootora

> Documento vivo. Substitui `06-stack-desenvolvimento.md` — atualizado com tudo que
> entrou desde a versão original.

## 1. Mobile — React Native CLI (bare workflow), TypeScript

Decisão original mantida: bare workflow (não Expo), por causa das integrações nativas
do bloqueio de apps via Accessibility Service (já em uso). Projeto 100%
TypeScript, `strict: true`.

## 2. Backend — Firebase

| Serviço | Uso |
|---|---|
| Firebase Auth | E-mail/senha + Google Sign-In |
| Firestore | Banco de dados principal (ver `schema-firebase.md`) |
| Cloud Messaging (FCM) | Reservado pra reengajamento futuro (ver `roadmap-e-status.md`) — **não usado hoje**, o app usa notificação local |
| Cloud Functions | **Ainda não usado.** Único uso planejado: verificação de assinatura via Google Play Developer API (`procedimento-loja.md`) — exige migração pro plano Blaze quando chegar lá |
| Analytics | Eventos custom de produto (tarefas, streak, bloqueio de apps, onboarding/tutorial/tour, permissões) — wrapper em `src/services/analytics.ts`, uma função por evento |
| Crashlytics | Relato de crash + `registrarErro` manual nos catches existentes de `hooks/` — wrapper em `src/services/crashlytics.ts` |

## 3. Bibliotecas em uso

| Necessidade | Biblioteca |
|---|---|
| Firebase (nativo) | `@react-native-firebase/app`, `/auth`, `/firestore`, `/messaging`, `/analytics`, `/crashlytics` |
| Login Google | `@react-native-google-signin/google-signin` |
| Navegação | `@react-navigation/native` + `/native-stack` + `/bottom-tabs` |
| Armazenamento local leve | `@react-native-async-storage/async-storage` |
| Animações | `Animated` do core (Splash, Tutorial, LoadingIndicator) — `react-native-reanimated` não está instalado |
| Notificações locais | `@notifee/react-native` |
| Seletor de horário | `@react-native-community/datetimepicker` |
| Ícones | `lucide-react-native` |
| Testes | Jest + `@testing-library/react-native` |
| Seed de dados (dev only) | `firebase-admin` (`seed-firestore.js`, nunca roda no app) |
| Assinatura (📋 planejado) | `react-native-iap` — ainda não instalado |

## 4. Ambiente de desenvolvimento

- WSL2 (Ubuntu) no Windows + Android Studio rodando no lado Windows (SDK/emulador)
- **Gradle sempre roda de dentro do WSL** (`npx react-native run-android` via terminal
  WSL) — nunca pelo botão de sync do Android Studio quando o projeto vive no
  filesystem do WSL acessado via `\\wsl$`, isso causa `IOException: Incorrect function`
  (incompatibilidade de lock de arquivo no compartilhamento de rede)
- Editor recomendado pro dia a dia: VS Code + extensão WSL (Remote Development) —
  Android Studio reservado pra SDK Manager/AVD Manager
- ADB: servidor roda do lado Windows; dispositivo físico conecta direto no Windows
  (USB ou depuração sem fio), sem passthrough pro WSL
- Firebase project: `raiz-app-71d02` — nome de exibição público ajustado pra "Rootora"
- Pacote Android (`applicationId`/`namespace`): `com.luxthorapps.rootora` (antes
  `com.lucas.rootora`). O app Android no Firebase precisa estar registrado com esse
  pacote, e o `android/app/google-services.json` (gitignored) baixado dele. Nome npm:
  `rootora`; o componente registrado continua `raizApp` (`app.json`, `MainActivity`)
- `MainActivity` ignora o `savedInstanceState` (`super.onCreate(null)`): o
  `react-native-screens` não suporta restauração de Fragments pelo Android, e o
  Android matando o processo em background derrubava o app com "Screen fragments
  should never be restored" (visto via Crashlytics em ColorOS). Não remover.

## 5. Dívida técnica registrada

| Item | Estado | Migração planejada |
|---|---|---|
| Cálculo de streak/escudo | Roda no client, ao abrir o app | Cloud Function agendada, quando a base crescer |
| `streakAtual`/`escudosDisponiveis` | Graváveis diretamente pelo client | Endurecer regras (só Cloud Function admin escreve) antes de escalar |
| Exclusão de conta | Client-side, sem exclusão recursiva via Admin SDK: a lista de subcoleções é manual (`SUBCOLECOES_DO_USUARIO`), subcoleção nova esquecida fica órfã (ver `schema-firebase.md` seção 9) | Cloud Function, mesmo racional do item acima |
| Regra do saldo de blocos duplicada (Kotlin + TS) | `SaldoBloqueioMaquina.kt` (autoridade, roda sem JS) e `domain/saldoBloqueio.ts` (referência testada) — mantidas iguais só pelas fixtures compartilhadas (`domain/__fixtures__/saldoBloqueio.json`) | Aceito: o Service não tem JS. Mexer numa cópia exige mexer na outra + fixtures |
| Testes Kotlin | `testImplementation` junit + org.json no `app/build.gradle`; rodar com `cd android && ./gradlew :app:testDebugUnitTest` (não faz parte do `npm test`) | Incluir no CI quando houver |
| Estado do saldo de blocos | Só em SharedPreferences, sem backup/restauração nem sync (reinstalar zera o dia) | Aceito: o saldo vale um dia só |
| Verificação de assinatura | N/A ainda (feature não implementada) | Será Cloud Function desde o início, não dívida — ver `procedimento-loja.md` |

## 6. Permissões Android relevantes

| Permissão | Tipo | Onde é pedida |
|---|---|---|
| Accessibility Service | Manual, via Configurações do sistema (sem diálogo nativo) | `DivulgacaoAcessibilidadeScreen` (divulgação em destaque), dentro do fluxo de configuração de bloqueio de apps — mostrada ANTES de abrir as configurações |
| Notificações (`POST_NOTIFICATIONS`, Android 13+) | Runtime, diálogo nativo | `NotificationPrimingScreen`, uma vez no primeiro boot pós-onboarding |

Não usamos `QUERY_ALL_PACKAGES` — a lista de apps da tela de bloqueio é resolvida via
`<queries>` no manifesto (`MAIN`/`LAUNCHER`), que não exige o formulário de
justificativa de revisão manual da Play Store.
