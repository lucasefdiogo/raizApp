# language: pt
@CA-04 @feliz
Funcionalidade: Rotina estimada e janela noturna
  Cenário: Pausa de intenção dentro da janela noturna dobra o tempo de espera
    Dado que "rotina.confirmadoEm" está preenchido
    E que o horário atual está dentro da janela noturna
    E que esta é a 2ª sessão do dia, cuja pausa fora da janela seria de 20 segundos
    Quando a pessoa abre um app bloqueado
    Então a pausa de intenção exige 40 segundos para liberar
    E o texto mostrado é uma mensagem do banco de tema "noturno", não o texto padrão
