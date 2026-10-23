# TODO

Pendências abertas do projeto que não pertencem a uma feature específica.
Histórico das HUs antigas (formato lux kit, abandonado): `docs/historico/`.

## Teste manual em aparelho

- [ ] **Aviso de bloqueio desligado** (origem: `docs/historico/HU-03/progress.md`), com APK
      release standalone:
  - [ ] disparo do alarme com o aparelho em Doze
  - [ ] reagendamento após reboot
  - [ ] notificação real exibida
  - [ ] toque na notificação com o app em primeiro plano, em segundo plano e fechado
  - [ ] comportamento sem a permissão `POST_NOTIFICATIONS`

## Build nativo

- [ ] **Pergunta pro Lucas:** o `RootoraUsoAppsModule.kt` já foi compilado fora do
      sandbox? O log da HU-02 registra que ele nunca tinha sido compilado (o gradle
      falhava no ksp do async-storage dentro do sandbox). Confirmar com
      `npx react-native run-android` (ou `./gradlew :app:compileDebugKotlin`) no
      terminal WSL e fechar este item. Origem: `docs/historico/HU-02/progress.md`.

## Dívida técnica

- [ ] **Leitura duplicada de Firestore/nativo em Perfil + Bloqueio de apps:**
      `PerfilScreen` passou a chamar `useRegrasBloqueio(uid)` e `useRotina(uid)` (HU-09,
      pras linhas "Bloqueio de apps"/"Rotina noturna" com estado atual) além de
      `BloqueioAppsScreen`/`RotinaPerfilScreen`, que já usam os mesmos hooks. Como o
      `native-stack` do React Navigation mantém as telas anteriores montadas, isso
      duplica `buscarUsuario` (Firestore) e `listarAppsInstalados()` (nativo) enquanto
      as duas telas estão na pilha. Considerar hook/contexto compartilhado se o custo
      de leitura incomodar. Origem: revisão da HU-09 (`docs/hu/hu-09-bloqueio-config.md`).
- [ ] **Flash do status de acessibilidade no Perfil:** a linha "Bloqueio de apps" de
      `PerfilScreen` lê só `ativo` de `useAccessibilityPermission`, sem considerar o
      `carregando` do hook — pode mostrar "Desativado"/"Não configurado" por um
      instante antes do status real carregar. Nenhum cenário Gherkin cobre esse
      estado transitório. Origem: revisão da HU-09 (`docs/hu/hu-09-bloqueio-config.md`).

## Ambiente local

- [ ] Acrescentar `.bash_profile` ao `.git/info/exclude` (nó `/dev/null` criado pelo
      sandbox; faz a checagem de árvore limpa falhar). Origem:
      `docs/historico/HU-02/progress.md`.
