/**
 * Identifica qual alvo real da tela cada passo destaca — quem sabe medir
 * cada um (HomeScreen, pros passos 1-3; MainTabNavigator, pros 4-5) decide
 * como, este arquivo só nomeia qual.
 */
export type TourAlvoId =
  | 'streak'
  | 'adicionarTarefa'
  | 'bloqueioApps'
  | 'abaProgresso'
  | 'abaPerfil';

export interface TourPasso {
  alvo: TourAlvoId;
  texto: string;
}

export const TOUR_PASSOS: TourPasso[] = [
  {
    alvo: 'streak',
    texto:
      'Essa é sua sequência. Você ganha 1 proteção por semana pra dias difíceis — ela não some se você falhar 1 dia.',
  },
  {
    alvo: 'adicionarTarefa',
    texto:
      'Toque aqui pra adicionar uma tarefa. Marque até 3 como essenciais — só elas contam pro seu streak.',
  },
  {
    alvo: 'bloqueioApps',
    texto:
      'Esse é o nosso maior diferencial: escolha apps pra limitar, e use suas tarefas do dia pra desbloquear.',
  },
  {
    alvo: 'abaProgresso',
    texto: 'Aqui você vê seu histórico dos últimos 7 dias e seus desafios da semana.',
  },
  {
    alvo: 'abaPerfil',
    texto:
      'Aqui ficam suas configurações — porquê, notificações, bloqueio de apps e sua conta.',
  },
];

export const TOTAL_PASSOS_TOUR = TOUR_PASSOS.length;
