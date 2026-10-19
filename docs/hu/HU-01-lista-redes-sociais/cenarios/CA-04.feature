# language: pt
@CA-04 @excecao
Funcionalidade: Lista de apps bloqueáveis só com redes sociais
  Cenário: Nenhuma rede social instalada mostra o estado vazio
    Dado que nenhum pacote da lista curada está instalado no aparelho
    Quando o usuário abre a tela "Bloqueio de apps"
    Então a tela mostra o texto "Nenhuma rede social encontrada neste aparelho."
    E a tela não mostra nenhum item de app
