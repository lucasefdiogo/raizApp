# language: pt
@CA-03 @feliz
Funcionalidade: Lista de apps bloqueáveis só com redes sociais
  Cenário: Regra já salva mantém as marcações do usuário
    Dado que o usuário tem regrasBloqueio salva com apenas o pacote "com.google.android.youtube"
    E que Instagram e YouTube estão instalados no aparelho
    Quando o usuário abre a tela "Bloqueio de apps"
    Então YouTube aparece marcado
    E Instagram aparece desmarcado
