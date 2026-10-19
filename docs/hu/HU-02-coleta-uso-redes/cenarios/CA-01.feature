# language: pt
@CA-01 @feliz
Funcionalidade: Coleta do uso das redes sociais
  Cenário: Uso de hoje de uma rede da lista é gravado agregado
    Dado que o acesso de uso está concedido e consentimentoAcessoUso está gravado
    E que hoje o Instagram ficou 1200 segundos em primeiro plano em 3 aberturas
    Quando a coleta roda
    Então dailyLogs de hoje tem usoApps["com.instagram.android"] igual a { segundos: 1200, aberturas: 3 }
