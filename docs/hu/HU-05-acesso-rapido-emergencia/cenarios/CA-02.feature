# language: pt
@CA-02 @feliz
Funcionalidade: Acesso rápido e saída de emergência
  Cenário: Acesso rápido não altera o cooldown da sessão
    Dado que uma sessão está em cooldown com 20 minutos restantes
    Quando o usuário usa o acesso rápido
    Então o cooldown da sessão continua com 20 minutos restantes ao final do acesso rápido
