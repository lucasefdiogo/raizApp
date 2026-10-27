import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  onboarding: '@rootora/onboarding',
  tutorialVisto: 'tutorial_visto',
  notificationPrimingShown: 'notification_priming_shown',
  tourFuncionalidadesVisto: 'tour_funcionalidades_visto',
  /** Segunda-feira (YYYY-MM-DD) da semana em que a reflexão semanal (HU-08) já foi mostrada. */
  reflexaoSemanalVista: 'reflexao_semanal_vista',
  /**
   * Data (YYYY-MM-DD) até a qual a RotinaConfirmacaoScreen não deve
   * aparecer — gravada ao sair sem decidir (HU-10, RN09). Sem campo novo no
   * Firestore: fica só no aparelho.
   */
  rotinaConfirmacaoAdiada: 'rotina_confirmacao_adiada',
  /**
   * Marca que "Recalcular automaticamente" foi pedido — a próxima
   * abertura aplica a estimativa atual uma vez e limpa a chave (HU-10,
   * RN15). Sem campo novo no Firestore: fica só no aparelho.
   */
  rotinaRecalculoPendente: 'rotina_recalculo_pendente',
  /** Segunda-feira (YYYY-MM-DD) da semana em que a proposta do desafio de redução foi recusada. */
  desafioReducaoPropostaRecusadaEm: 'desafio_reducao_proposta_recusada_em',
  ativacaoBloqueioMostrada: 'ativacao_bloqueio_mostrada',
} as const;

export async function salvarItem<T>(chave: string, valor: T): Promise<void> {
  await AsyncStorage.setItem(chave, JSON.stringify(valor));
}

export async function lerItem<T>(chave: string): Promise<T | null> {
  const bruto = await AsyncStorage.getItem(chave);
  return bruto ? (JSON.parse(bruto) as T) : null;
}

export function chaveRecoveryShown(data: string): string {
  return `recovery_shown:${data}`;
}
