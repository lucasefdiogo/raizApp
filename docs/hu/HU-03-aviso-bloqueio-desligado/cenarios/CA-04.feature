# language: pt
@CA-04 @feliz
Funcionalidade: Aviso de bloqueio de apps desligado
  Cenário: Tocar na notificação abre o Bloqueio de apps
    Dado que a notificação "Bloqueio de apps desligado" está exibida
    Quando o usuário toca nela
    Então o app abre na tela "Bloqueio de apps"
