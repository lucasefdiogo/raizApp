# language: pt
@CA-01 @feliz
Funcionalidade: Acesso rápido e saída de emergência
  Cenário: Acesso rápido libera 2 minutos após 5 segundos de espera
    Dado que a cota de acesso rápido do dia está disponível
    Quando o usuário toca em "Acesso rápido (2 min)"
    Então a tela espera 5 segundos
    E libera 2 minutos de uso
