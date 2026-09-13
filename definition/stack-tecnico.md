# Stack Técnico — Rootora

> Documento vivo. Substitui `06-stack-desenvolvimento.md` — atualizado com tudo que
> entrou desde a versão original.

## 1. Mobile — React Native CLI (bare workflow), TypeScript

Decisão original mantida: bare workflow (não Expo), por causa das integrações nativas
de Fase 3 (bloqueio de apps via Accessibility Service, já em uso). Projeto 100%
TypeScript, `strict: true`.

## 2. Backend — Firebase

| Serviço | Uso |
|---|---|
| Firebase Auth | E-mail/senha + Google Sign-In |
| Firestore | Banco de dados principal (ver `schema-firebase.md`) |
| Cloud Messaging (FCM) | Reservado pra Fase 2 (reengajamento) — **não usado no MVP**, que usa notificação local |
| Cloud Functions | **Ainda não usado.** Único uso planejado: verificação de assinatura via Google Play Developer API (`procedimento-loja.md`) — exige migração pro plano Blaze quando chegar lá |

## 3. Bibliotecas em uso

| Necessidade | Biblioteca |
|---|---|
| Firebase (nativo) | `@react-native-firebase/app`, `/auth`, `/firestore`, `/messaging` |
| Login Google | `@react-native-google-signin/google-signin` |
| Navegação | `@react-navigation/native` + `/native-stack` + `/bottom-tabs` |
| Armazenamento local leve | `@react-native-async-storage/async-storage` |
| Animações | `react-native-reanimated` (Splash, Tutorial) + `Animated` do core (LoadingIndicator) |
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

## 5. Dívida técnica registrada

| Item | Estado | Migração planejada |
|---|---|---|
| Cálculo de streak/escudo | Roda no client, ao abrir o app | Cloud Function agendada, quando a base crescer |
| `streakAtual`/`escudosDisponiveis` | Graváveis diretamente pelo client | Endurecer regras (só Cloud Function admin escreve) antes de escalar |
| Exclusão de conta | Client-side, sem exclusão recursiva via Admin SDK | Cloud Function, mesmo racional do item acima |
| Verificação de assinatura | N/A ainda (feature não implementada) | Será Cloud Function desde o início, não dívida — ver `procedimento-loja.md` |

## 6. Permissões Android relevantes

| Permissão | Tipo | Onde é pedida |
|---|---|---|
| Accessibility Service | Manual, via Configurações do sistema (sem diálogo nativo) | `AccessibilityPrimingScreen`, dentro do fluxo de configuração de bloqueio de apps |
| Notificações (`POST_NOTIFICATIONS`, Android 13+) | Runtime, diálogo nativo | `NotificationPrimingScreen`, uma vez no primeiro boot pós-onboarding |
| `QUERY_ALL_PACKAGES` | Declarada no manifesto, sem diálogo pro usuário | N/A — revisada pela Play Store na submissão (`procedimento-loja.md`, exige formulário de justificativa) |

## 7. Próximo passo sugerido

Com este documento e os demais (`schema-firebase.md`, `navegacao-componentes.md`,
`regras-de-negocio.md`, `design-system-rootora.md`, `roadmap-e-status.md`) todos
atualizados, a pasta `/definition` está pronta pra ser criada. Falta só mover os
arquivos que não mudam de conteúdo (`00-instrucoes-do-projeto.md`,
`02-identidade-visual.md`, banco de frases e versículos) e aposentar oficialmente
`03-mvp.md`, `04-fase2.md`, `05-fase3.md` e `regras-streak-e-textos-mvp.md`.
