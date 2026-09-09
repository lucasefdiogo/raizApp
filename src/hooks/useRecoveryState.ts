import { useCallback, useEffect, useState } from 'react';
import { StatusDiaResultante } from '../domain/types';
import { buscarSystemMessage } from '../services/firestore';
import { chaveRecoveryShown, lerItem, salvarItem } from '../utils/storage';

export type RecoveryStateTipo = 'escudo' | 'reduzido';

interface UseRecoveryStateResultado {
  deveExibir: boolean;
  tipo: RecoveryStateTipo | null;
  corpo: string | null;
  marcarComoExibido: () => void;
}

const SYSTEM_MESSAGE_KEY: Record<RecoveryStateTipo, string> = {
  escudo: 'escudo_ativado',
  reduzido: 'streak_reduzido',
};

function dataDeOntemISO(): string {
  const ontem = new Date();
  ontem.setUTCDate(ontem.getUTCDate() - 1);
  return ontem.toISOString().slice(0, 10);
}

function substituirPlaceholders(
  corpo: string,
  streakAtual: number,
  diasTotaisAtivos: number,
): string {
  return corpo
    .replace('{{streak}}', String(streakAtual))
    .replace('{{diasTotais}}', String(diasTotaisAtivos));
}

/**
 * Cruza statusDiaAnterior (já calculado por useStreak) com o AsyncStorage
 * para decidir se a tela de recaída deve aparecer — no máximo uma vez por
 * data, mesmo padrão de chave usado por tutorial_visto. Não lê dailyLogs
 * diretamente: reaproveita o valor que useStreak já expõe.
 */
export function useRecoveryState(
  statusDiaAnterior: StatusDiaResultante | null,
  streakAtual: number,
  diasTotaisAtivos: number,
): UseRecoveryStateResultado {
  const [deveExibir, setDeveExibir] = useState(false);
  const [tipo, setTipo] = useState<RecoveryStateTipo | null>(null);
  const [corpo, setCorpo] = useState<string | null>(null);
  const [dataOntem] = useState(dataDeOntemISO);

  useEffect(() => {
    if (
      statusDiaAnterior !== 'protegido_escudo' &&
      statusDiaAnterior !== 'perdido'
    ) {
      return;
    }

    let cancelado = false;
    const tipoResolvido: RecoveryStateTipo =
      statusDiaAnterior === 'protegido_escudo' ? 'escudo' : 'reduzido';

    async function verificar() {
      const jaExibido = await lerItem<boolean>(chaveRecoveryShown(dataOntem));
      if (jaExibido) {
        return;
      }

      const mensagem = await buscarSystemMessage(
        SYSTEM_MESSAGE_KEY[tipoResolvido],
      );
      const corpoResolvido = substituirPlaceholders(
        mensagem?.corpo ?? '',
        streakAtual,
        diasTotaisAtivos,
      );

      if (!cancelado) {
        setTipo(tipoResolvido);
        setCorpo(corpoResolvido);
        setDeveExibir(true);
      }
    }

    verificar();

    return () => {
      cancelado = true;
    };
  }, [statusDiaAnterior, dataOntem, streakAtual, diasTotaisAtivos]);

  const marcarComoExibido = useCallback(() => {
    salvarItem(chaveRecoveryShown(dataOntem), true);
    setDeveExibir(false);
  }, [dataOntem]);

  return { deveExibir, tipo, corpo, marcarComoExibido };
}
