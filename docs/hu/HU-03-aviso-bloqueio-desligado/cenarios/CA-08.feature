# language: pt
@CA-08 @excecao
Funcionalidade: Aviso de bloqueio de apps desligado
  Cenário: dailyLog criado só por acessibilidade não altera streak nem progresso
    Dado que ontem não existia dailyLog
    E que o streak e o status de ontem no Progresso foram calculados
    Quando a sincronização grava acessibilidade em dailyLogs de ontem
    Então o streak continua igual
    E o status de ontem no Progresso continua igual
