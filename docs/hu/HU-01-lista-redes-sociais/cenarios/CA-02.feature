# language: pt
@CA-02 @feliz
Funcionalidade: Lista de apps bloqueáveis só com redes sociais
  Cenário: Apps fora da lista curada não aparecem
    Dado que Instagram, WhatsApp e Chrome estão instalados no aparelho
    Quando o usuário abre a tela "Bloqueio de apps"
    Então a lista mostra o item Instagram
    E a lista não mostra os itens WhatsApp e Chrome
