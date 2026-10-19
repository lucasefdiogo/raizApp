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
