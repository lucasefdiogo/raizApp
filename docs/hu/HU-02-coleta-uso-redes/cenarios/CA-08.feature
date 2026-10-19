# language: pt
@CA-08 @excecao
Funcionalidade: Coleta do uso das redes sociais
  Cenário: dailyLog criado só por usoApps não altera streak nem progresso
    Dado que ontem não existia dailyLog
    E que o streak e o status de ontem no Progresso foram calculados
    Quando a coleta grava usoApps em dailyLogs de ontem
    Então o streak continua igual
    E o status de ontem no Progresso continua igual
