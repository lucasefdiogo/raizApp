# CI/CD Android

O workflow `.github/workflows/android-release.yml` executa em pushes na `main` e manualmente. Primeiro roda npm ci, lint, Jest e TypeScript; depois configura Java 17, Node 22, SDK 37 e Gradle, e executa os testes Kotlin quando o arquivo Firebase estiver configurado. A falta desse secret é informada e impede a release, mas não as verificações independentes. O job Android depende do sucesso das verificações iniciais.

A publicação está desativada por padrão. Quando ativada, o workflow gera e verifica o AAB com a chave de upload, disponibiliza-o como artefato e publica somente na faixa fechada configurada. A Play pode exigir revisão ou publicação gerenciada antes de entregar a versão aos testadores. Não há promoção para produção. O job é serializado com fila de até 100 execuções; execuções acima desse limite são canceladas. Antes do upload, o commit precisa ainda ser o topo da main. A ordem de entrada na fila não necessariamente coincide com a ordem dos disparos; versões antigas recusadas pela Play exigem nova execução. Uma atualização da main durante o upload pode fazer a versão anterior ser publicada primeiro, seguida da mais recente. Uma reexecução (`Re-run jobs`) é recusada; inicie uma nova execução manual na main.

## Configuração

Em **Settings → Secrets and variables → Actions**, crie os secrets do repositório:

- `ANDROID_KEYSTORE_BASE64`: arquivo da keystore oficial de upload em Base64.
- `ANDROID_KEYSTORE_PASSWORD`: senha da keystore.
- `ANDROID_KEY_ALIAS`: alias da chave de upload.
- `ANDROID_KEY_PASSWORD`: senha da chave.
- `FIREBASE_GOOGLE_SERVICES_BASE64`: `google-services.json` do app Android existente em Base64.
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`: conteúdo JSON integral da chave da conta de serviço.

No Linux, gere os valores sem quebras de linha com `base64 -w 0 caminho/do/arquivo`. Copie a saída diretamente para o secret correspondente e não a compartilhe nem a salve no repositório. Use uma keystore de upload já vinculada ao aplicativo; uma chave diferente será rejeitada pela Play. Os arquivos temporários são removidos ao final do job; em cancelamentos abruptos, a limpeza depende também da destruição do runner hospedado.

Configure as variáveis de repositório:

- `ANDROID_VERSION_CODE_BASE`: inteiro não negativo, escolhido conforme a seção de versionamento.
- `GOOGLE_PLAY_CLOSED_TRACK`: identificador exato da faixa fechada existente, por exemplo `alpha` ou o nome interno da faixa criada no Play Console. Confira no endereço da faixa no Console ou via Google Play Developer API (`edits.tracks.list`); o nome exibido não necessariamente é o identificador. Consulte [a documentação oficial das faixas](https://developers.google.com/android-publisher/tracks). Não use `production`, `beta` (testes abertos), `qa` (testes internos), `internal` ou `internalsharing`.
- `ANDROID_RELEASE_ENABLED`: deixe ausente ou diferente de `true` até concluir a validação. Para ativar, defina exatamente `true`. Para desativar rapidamente, altere para `false` e cancele eventuais execuções em andamento; uma publicação já enviada precisa ser administrada no Play Console.

## Conta de serviço

No Google Cloud, selecione o projeto associado ao Play Console, habilite a Google Play Android Developer API e crie uma conta de serviço dedicada. Crie uma chave JSON, guarde-a com segurança e copie seu conteúdo para `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`. No Play Console, em usuários e permissões, convide o endereço da conta e limite o acesso ao aplicativo Rootora, concedendo somente permissões necessárias para visualizar o aplicativo e criar/gerenciar lançamentos de teste fechado. Não conceda administração de usuários nem acesso a produção. O acesso à faixa também depende da configuração de testers e da faixa no Console. Consulte a documentação oficial atual para os nomes exatos das permissões, que podem mudar.

Antes de ativar, confirme no Console a impressão digital SHA-256 da chave de upload, o application ID, a faixa fechada, as permissões da conta e o maior versionCode já usado em qualquer faixa ou upload. Confira também se a configuração de publicação gerenciada exige ação manual. Só então defina a base, os secrets e `ANDROID_RELEASE_ENABLED=true`.

## Versionamento e recuperação

O Gradle mantém `versionCode 14` e `versionName 1.13` locais; o desenvolvedor altera o `versionName` no Gradle quando desejar. Para CI, `versionCode = ANDROID_VERSION_CODE_BASE + github.run_number`. Escolha uma base **maior ou igual ao maior código já usado**, incluindo uploads não publicados, em todas as faixas. O número do workflow cresce por execução, inclusive manuais e falhas; lacunas são normais. Alterar ou recriar o workflow pode reiniciar o contador: antes, aumente a base para ficar acima de todos os códigos usados. Antes de um upload externo, pause o pipeline e reserve um código inferior à próxima versão do CI ou aumente a base depois. A Play rejeita códigos já usados; não é possível garantir antecipadamente a ordem diante de uploads externos concorrentes. Não faça uploads externos simultâneos.

Se falhar após atribuição do código, verifique no Play Console se o bundle foi recebido e se houve publicação. Nunca reutilize a mesma execução: corrija a causa e inicie uma nova execução manual na main, que gera outro número. Se um upload externo ultrapassou a sequência, aumente a base acima do maior código usado. Não diminua a base. Se a versão foi enviada mas ainda aguarda revisão, acompanhe-a no Console antes de repetir.

## Operação e diagnóstico

Em **Actions → Android release → Run workflow**, selecione `main` e execute. Em uma execução concluída, baixe `rootora-release-<versionCode>` na seção Artifacts. Com publicação desativada, não é gerado AAB assinado.

- Falha de autenticação/permissão: confira API habilitada, JSON, convite aceito e permissões no app e na faixa.
- Falha de assinatura: confira alias, senhas e fingerprint da chave de upload no Console; o Gradle rejeita ausência de credenciais e o certificado de debug é recusado. A Play valida a chave oficial no upload.
- Versão já utilizada ou menor: confira todos os códigos usados e aumente a base; dispare nova execução.
- Faixa inválida: confira o identificador interno e se é uma faixa fechada existente.
- Firebase ou SDK ausente: confira o secret Base64 e os logs de instalação do SDK. Nunca publique o conteúdo dos secrets nos logs.
- Testes ou compilação: consulte o primeiro passo com falha; nenhuma publicação ocorre após falha de validação.

Somente pushes na main ou execução manual nessa branch chegam ao job com secrets; o workflow não é acionado por pull requests. Evite habilitar Actions para código de origem não confiável com acesso a secrets.
