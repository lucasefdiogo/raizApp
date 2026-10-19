# language: pt
@CA-02 @feliz
Funcionalidade: Coleta do uso das redes sociais
  Cenário: App fora da lista curada não é gravado
    Dado que o acesso de uso está concedido e consentimentoAcessoUso está gravado
    E que hoje o Chrome ficou 600 segundos em primeiro plano
    Quando a coleta roda
    Então usoApps de hoje não tem a chave "com.android.chrome"
