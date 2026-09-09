import { useState } from 'react';
import { Streak } from '../domain/types';

// Dados mockados para a primeira versão da Home — leitura de
// users/{userId}.streak no Firestore fica para uma próxima tarefa.
const STREAK_MOCK: Streak = {
  streakAtual: 4,
  diasTotaisAtivos: 11,
  escudosDisponiveis: 1,
  marcosAtingidos: [3],
  ultimoDiaAtivo: new Date().toISOString().slice(0, 10),
  statusStreak: 'ativo',
};

export function useStreak() {
  const [streak] = useState<Streak>(STREAK_MOCK);
  return { streak };
}
