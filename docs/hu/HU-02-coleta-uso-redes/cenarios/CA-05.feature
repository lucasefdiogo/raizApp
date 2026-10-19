# language: pt
@CA-05 @feliz
Funcionalidade: Coleta do uso das redes sociais
  Cenário: Permitir acesso de uso grava o consentimento
    Dado que o usuário está na tela "Medir seu tempo nas redes"
    Quando toca em "Permitir acesso de uso"
    Então users tem consentimentoAcessoUso igual à data de hoje no formato YYYY-MM-DD
    E as configurações de acesso de uso do Android são abertas
