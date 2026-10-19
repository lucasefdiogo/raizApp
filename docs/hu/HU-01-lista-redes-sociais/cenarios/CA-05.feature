# language: pt
@CA-05 @excecao
Funcionalidade: Lista de apps bloqueáveis só com redes sociais
  Cenário: Regra antiga com app fora da lista é limpa na atualização
    Dado que o usuário tem regrasBloqueio salva com os pacotes "com.instagram.android" e "com.android.chrome"
    E que não há regrasBloqueioPendentes
    Quando o usuário abre o app pela primeira vez após a atualização
    Então regrasBloqueio.apps contém apenas "com.instagram.android"
    E regrasBloqueioPendentes continua null
    E abrir o Chrome não exibe a tela de interceptação
