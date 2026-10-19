# language: pt
@CA-07 @excecao
Funcionalidade: Coleta do uso das redes sociais
  Cenário: Voltar das configurações sem conceder mostra o aviso
    Dado que o usuário tocou em "Permitir acesso de uso"
    Quando volta das configurações sem conceder o acesso
    Então a tela mostra "Acesso de uso desligado. O bloqueio continua funcionando, só sem medir o tempo."
