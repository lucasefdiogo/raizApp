# language: pt
@CA-02 @feliz
Funcionalidade: Aviso de bloqueio de apps desligado
  Cenário: Segundo lembrete três dias depois e nenhum outro
    Dado que o serviço foi desligado e o 1º lembrete foi exibido
    E que o serviço continua desligado
    Quando chegam as 09:00 do terceiro dia depois do 1º lembrete
    Então é exibido um lembrete com o corpo "Desligado há alguns dias. Toque para religar quando quiser."
    E não há nenhum lembrete agendado depois dele
