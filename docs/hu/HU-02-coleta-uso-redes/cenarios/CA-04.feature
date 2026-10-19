# language: pt
@CA-04 @feliz
Funcionalidade: Coleta do uso das redes sociais
  Cenário: Dia anterior sem abertura do app é preenchido
    Dado que o acesso de uso está concedido e consentimentoAcessoUso está gravado
    E que ontem o TikTok ficou 900 segundos em primeiro plano em 2 aberturas
    E que o app não foi aberto ontem
    Quando a coleta roda hoje
    Então dailyLogs de ontem tem usoApps["com.zhiliaoapp.musically"] igual a { segundos: 900, aberturas: 2 }
