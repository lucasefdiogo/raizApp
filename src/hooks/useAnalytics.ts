import { useMemo } from 'react';
import {
  logAcessibilidadeSaibaMais,
  logAlternativaEscolhida,
  logDesafioReducaoFechado,
  logDesafioReducaoProposto,
  logDesafioReducaoRespondido,
  logInterceptShown,
  logReflexaoSemanalExibida,
  logReflexaoSemanalFechada,
  logTravadoAberto,
  logTravadoEstado,
  logValvulaEscolhida,
} from '../services/analytics';

/**
 * Expõe os eventos de analytics usados direto por telas, sem elas importarem
 * `services/` — a mesma regra de camada que `useDailyTasks`/`useStreak` já
 * seguem pra seus próprios eventos. `useMemo` com deps vazias porque as
 * funções vêm de `services/analytics` (estáveis, sem estado próprio).
 */
export function useAnalytics() {
  return useMemo(
    () => ({
      logAcessibilidadeSaibaMais,
      logAlternativaEscolhida,
      logDesafioReducaoFechado,
      logDesafioReducaoProposto,
      logDesafioReducaoRespondido,
      logInterceptShown,
      logReflexaoSemanalExibida,
      logReflexaoSemanalFechada,
      logTravadoAberto,
      logTravadoEstado,
      logValvulaEscolhida,
    }),
    [],
  );
}
