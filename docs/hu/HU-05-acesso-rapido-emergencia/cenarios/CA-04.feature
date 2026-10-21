# language: pt
@CA-04 @feliz
Funcionalidade: Acesso rápido e saída de emergência
  Cenário: Cota esgotada e sem sessão oferece a emergência
    Dado que a cota de acesso rápido do dia já foi usada
    E que não há sessão disponível
    Quando o usuário abre um app bloqueado
    Então a tela mostra a saída de emergência
