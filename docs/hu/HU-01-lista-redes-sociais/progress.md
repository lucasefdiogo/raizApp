# Progress — HU-01

Planejamento: HU pronta, branch feature/HU-01-lista-redes-sociais

## Roteiro de verificação manual em aparelho físico (para o Lucas, no fim)

Build: APK release standalone (ver memória de build em device físico). Aparelho com o Accessibility Service ativado.

### CA-04: sem rede social instalada
1. Aparelho (ou perfil) sem nenhum dos pacotes da lista curada (desinstale/desative Instagram, TikTok, YouTube etc.; o YouTube de fábrica pode só ser desativado).
2. Abra Perfil > Bloqueio de apps.
3. Esperado: breve carregamento, depois o texto "Nenhuma rede social encontrada neste aparelho." e nenhum item de app nem checkbox.
4. Conferir com TalkBack que o texto é lido.

### CA-05: limpeza de regra antiga
1. Instale a versão ANTERIOR, configure o bloqueio marcando Instagram e Chrome (ou outro app fora da lista), sem pendência.
2. Atualize para a build desta HU por cima (sem desinstalar) e abra o app uma vez.
3. Abra Bloqueio de apps: Chrome não aparece; Instagram segue marcado; sem aviso de alteração pendente.
4. No Firestore, `regrasBloqueio.apps` só tem `com.instagram.android` e `regrasBloqueioPendentes` é null.
5. Dentro da janela de bloqueio, abra o Chrome: a tela de interceptação NÃO aparece. Abra o Instagram: aparece.
6. Variante com pendência: antes de atualizar, deixe uma alteração pendente que inclua o Chrome; após atualizar e abrir, confira que a pendente também perdeu o Chrome e, no dia da vigência (com o app fechado), o Chrome continua livre.

- TASK-01: reporter `jest-junit` no `jest.config.js` (`reports/junit`). Conferido: `npm test` gera um `junit.xml` pelo config; o `testCommand` do `verify.config.json` (`--reporters=default --reporters=jest-junit`) substitui o `reporters` do config e também gera um único `junit.xml`, sem duplicar. Obs.: com `--reporters` variádico, o caminho de teste precisa vir depois de `--`.
- TASK-02: `src/domain/redesSociais.ts` com `PACOTES_REDES_SOCIAIS` (RN-01), `PACOTE_YOUTUBE` e `filtrarRedesSociaisInstaladas` (genérico em `{ packageName }`, para o domínio não importar o tipo nativo). Suíte: 110 suítes / 1068 testes verdes; tsc ok.
- TASK-03: `appsIniciaisSelecionados` em `domain/redesSociais.ts` (RN-03). Só a regra pura: a ligação com `BloqueioAppsScreen` (efeito de inicialização) fica na TASK-07, junto do filtro da lista; ligar antes pré-marcaria todos os apps instalados. Suíte: 110 suítes / 1071 testes verdes; tsc ok.
- TASK-04: `limparAppsForaDaListaCurada(regras, pendentes)` em `domain/appBlock.ts` (RN-06/RN-07): filtra `apps` da vigente e da pendente (mantém `efetivaEm`, janelas e config de blocos), devolve `mudou` para o chamador só gravar quando preciso. Suíte: 110 suítes / 1075 testes verdes; tsc e eslint ok.
- TASK-05: `useSincronizarRegrasBloqueio` agora resolve a promoção, limpa (`limparAppsForaDaListaCurada`) e só então grava e espelha no nativo (vigente e pendente), na ordem pedida. Gravação: promovida -> `promoverRegrasBloqueioPendentes` com a regra limpa; não promovida e mudou -> `salvarRegrasBloqueioImediatas` (+ pendente limpa, se houver); regra já limpa -> nenhuma escrita (RN-07). Sem Kotlin, então sem JUnit/Gradle. A limpeza roda em toda abertura (idempotente), sem flag de "primeira abertura". Fixture `VIGENTE` do teste antigo trocada de `com.whatsapp` para `com.instagram.android`, pois WhatsApp agora é (corretamente) limpo. Lacuna aceita: entre a atualização e a primeira abertura, o nativo ainda usa a cópia antiga (inclui promoção de pendente antiga). Prettier já acusava `useSincronizarRegrasBloqueio.ts` antes da task; não reformatei. Suíte: 110 suítes / 1079 testes verdes; tsc e eslint ok.
- TASK-06: `<queries>` do `AndroidManifest.xml` agora tem só os 12 `<package>` da lista curada (sem `MAIN`/`LAUNCHER`, sem `QUERY_ALL_PACKAGES`); teste em `src/native/androidManifest.test.ts` compara o manifesto (sem comentários) com `PACOTES_REDES_SOCIAIS`. Teste lê o XML com `require('fs')` porque o projeto não tem `@types/node` (não instalei). Pontos que resolvem nome/ícone por pacote, conferidos por leitura (sem build/aparelho): (1) `listarAppsInstalados` usa `queryIntentActivities(MAIN/LAUNCHER)`; com a visibilidade restrita o Android devolve só os pacotes declarados instalados, o que é exatamente a RN-02, e o filtro JS da TASK-07 fica como defesa; (2) `RootoraAccessibilityService.resolverAppLabel` usa `getApplicationInfo` com fallback para o nome do pacote, e só roda para apps bloqueados, todos da lista após a limpeza; (3) `abrirApp` usa `getLaunchIntentForPackage` de app bloqueado (na lista); (4) `InterceptScreen`/`InterceptRoot` recebem `appLabel` pronto do nativo; (5) `InterceptDebugScreen` usa mock fixo (`com.instagram.android`, na lista) e `AccessibilityDebugScreen` só mostra pacotes de eventos, sem PackageManager. Risco residual: confirmar em aparelho que o ícone/nome aparecem (roteiro manual). Suíte: 111 suítes / 1081 testes verdes; tsc e eslint ok.
