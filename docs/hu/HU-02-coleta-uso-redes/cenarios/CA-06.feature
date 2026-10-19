# language: pt
@CA-06 @excecao
Funcionalidade: Coleta do uso das redes sociais
  Cenário: Sem acesso de uso nada é coletado
    Dado que o acesso de uso não está concedido
    Quando o app vem para o primeiro plano
    Então nenhum dailyLog recebe o campo usoApps
    E a tela "Bloqueio de apps" mostra a entrada "Medir tempo nas redes"
