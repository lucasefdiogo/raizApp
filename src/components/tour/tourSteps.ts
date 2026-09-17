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
      'Toque aqui pra adicionar uma tarefa. Marque até 3 como essenciais — só elas contam pra sua sequência.',
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

/**
 * Espaço vertical mínimo garantido pro balão de um passo — indicador
 * ("Passo N de 5") + até 3 linhas do texto mais longo + a linha de
 * controles ("Pular tour"/"Próximo") + padding, com folga. Compartilhado
 * entre quem decide SE precisa rolar a tela antes de medir (HomeScreen,
 * pros alvos dentro do ScrollView) e quem efetivamente limita a altura do
 * balão (FeatureTourOverlay) — os dois precisam concordar no mesmo número,
 * senão um acha que "cabe" enquanto o outro ainda corta o texto (bug real
 * visto em device físico: o texto vinha cortado mesmo no lado que a
 * HomeScreen já tinha decidido "está visível o suficiente").
 */
export const ALTURA_MINIMA_TOOLTIP_TOUR = 240;
