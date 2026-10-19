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
