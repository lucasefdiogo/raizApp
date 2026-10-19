# language: pt
@CA-01 @feliz
Funcionalidade: Lista de apps bloqueáveis só com redes sociais
  Cenário: Primeira configuração pré-marca as redes sociais e deixa o YouTube livre
    Dado que o usuário não tem regrasBloqueio salva
    E que Instagram, TikTok e YouTube estão instalados no aparelho
    Quando o usuário abre a tela "Bloqueio de apps"
    Então a lista mostra exatamente os itens Instagram, TikTok e YouTube
    E Instagram e TikTok aparecem marcados
    E YouTube aparece desmarcado com a dica "Usa para estudar? Pode deixar livre."
