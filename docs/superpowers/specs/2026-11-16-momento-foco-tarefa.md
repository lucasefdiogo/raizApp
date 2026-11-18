# Momento de foco a partir da tarefa

## Objetivo

Dar às tarefas da Home uma ação de início, além da marcação de conclusão. O fluxo mantém uma sessão curta ligada à tarefa e oferece ajuda opcional para destravar.

## Fluxo

Uma tarefa pendente mostra **Começar**. A tela apresenta o título da tarefa, escolha de 2, 5 ou 10 minutos, **Iniciar momento de foco** e **Estou travado**. A última ação abre o TravadoFlow com a mesma tarefa. Durante a contagem, **Parar aqui** encerra o momento sem concluir a tarefa. Ao completar, a pessoa pode continuar por 10 minutos, marcar a tarefa como feita ou parar. Somente a ação explícita marca a tarefa.

Voltar pelo Android durante a contagem também encerra e registra a sessão, sem concluir a tarefa. O texto do modo temporário usa “bloqueio de apps”; “proteção” continua reservado ao streak.

Enquanto a contagem corre, os apps já selecionados em Bloqueio de apps são interceptados, mesmo fora das janelas habituais. O modo temporário não altera regras permanentes, saldo, streak ou acesso de emergência. A interceptação mostra o foco em andamento, oferece retorno ao Rootora e uma saída explícita **Encerrar momento de foco**. Apps não selecionados e recursos do sistema continuam acessíveis. Sem serviço de Acessibilidade ou apps selecionados, o cronômetro funciona e a interface não promete bloqueio.

O prazo absoluto fica em SharedPreferences para o serviço funcionar com o React Native suspenso. O prazo expirado deixa de interceptar. Encerrar pelo Rootora ou pela interceptação remove o modo temporário. Não há novo dado no Firestore; o registro de sessão existente continua associado ao `tarefaId`.

## Limites

Não é um bloqueio total do dispositivo. Com a MainActivity encerrada pelo sistema, o prazo nativo ainda expira e a pessoa pode encerrar pela interceptação; a tela do cronômetro não é restaurada automaticamente.
