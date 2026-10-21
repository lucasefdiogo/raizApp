# language: pt
@CA-03 @feliz
Funcionalidade: Acesso rápido e saída de emergência
  Cenário: Intervalo entre acessos rápidos cresce a cada uso
    Dado que a cota diária de acesso rápido é 3
    Quando o usuário usa o 1º acesso rápido do dia
    Então a tela mostra "próximo acesso rápido em 15 min"
    Quando o usuário usa o 2º acesso rápido do dia
    Então a tela mostra "próximo acesso rápido em 30 min"
    Quando o usuário usa o 3º acesso rápido do dia
    Então a opção de acesso rápido não aparece mais nesse dia
