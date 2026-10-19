# language: pt
@CA-03 @feliz
Funcionalidade: Coleta do uso das redes sociais
  Cenário: Coleta repetida não duplica valores
    Dado que o acesso de uso está concedido e consentimentoAcessoUso está gravado
    E que a coleta já gravou usoApps["com.instagram.android"] igual a { segundos: 1200, aberturas: 3 } hoje
    Quando a coleta roda de novo sem uso novo
    Então usoApps["com.instagram.android"] de hoje continua { segundos: 1200, aberturas: 3 }
