# language: pt
@CA-05 @feliz
Funcionalidade: Acesso rápido e saída de emergência
  Cenário: Completar a respiração libera 2 minutos e registra o uso
    Dado que a tela de emergência está aberta
    Quando o usuário completa a respiração de 60 segundos
    Então são liberados 2 minutos de uso
    E o contador emergencias do dia aumenta em 1
