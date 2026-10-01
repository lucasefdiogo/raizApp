import { useCallback } from 'react';
import { AcaoIntercept, EstadoTela, Interceptacao } from '../domain/types';
import { hojeISOLocal } from '../domain/data';
import { registrarInterceptacaoNoDia } from '../services/firestore';
import { registrarErro } from '../services/crashlytics';
import { logInterceptAction } from '../services/analytics';

interface UseInterceptResultado {
  /** Acrescenta um registro em dailyLogs/{hoje}.interceptacoes e loga `intercept_action`. */
  registrarAcao: (estadoTela: EstadoTela, acao: AcaoIntercept) => void;
}

/**
 * Histórico de interceptações do dia (seção 7 da spec 09-ponte-fuga-tarefa)
 * — cada decisão tomada na InterceptScreen vira um registro, usado nas
 * métricas de validação (seção 10: taxa de conversão da fuga, taxa de
 * embalo). Não inclui `estadoTravado` nem nenhum outro dado emocional —
 * isso já é responsabilidade só de useFocusSession/SessaoFoco. Grava via
 * `arrayUnion` (nunca lê o array antes) — evita que duas interceptações
 * concorrentes se pisem sobrescrevendo o array uma da outra.
 */
export function useIntercept(
  uid: string,
  packageName: string,
): UseInterceptResultado {
  const registrarAcao = useCallback(
    (estadoTela: EstadoTela, acao: AcaoIntercept) => {
      logInterceptAction(acao);
      const nova: Interceptacao = {
        app: packageName,
        hora: new Date().toISOString(),
        estadoTela,
        acao,
      };
      (async () => {
        try {
          await registrarInterceptacaoNoDia(uid, hojeISOLocal(), nova);
        } catch (erro) {
          registrarErro(erro as Error, 'useIntercept.registrarAcao');
        }
      })();
    },
    [uid, packageName],
  );

  return { registrarAcao };
}
