import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { minutosRestantesCooldown } from '../domain/saldoBloqueio';
import { obterEstadoBloqueio } from '../native/AccessibilityDetection';
import { registrarErro } from '../services/crashlytics';

interface UseCooldownRestanteResultado {
  /** null = banner não deve aparecer (fora de COOLDOWN, ou nativo não respondeu ainda). */
  minutosRestantes: number | null;
}

/**
 * Tempo até a próxima sessão liberar, pro banner de cooldown da Home
 * (HU-14, RN05-RN07). Lê o estado nativo ao focar e a cada 1 minuto só
 * enquanto a Home está em foco — sem notificação, sem trabalho em segundo
 * plano (RN06); a notificação da sessão ativa é tratada só no nativo (ver
 * RootoraAccessibilityService).
 */
export function useCooldownRestante(): UseCooldownRestanteResultado {
  const [minutosRestantes, setMinutosRestantes] = useState<number | null>(null);

  const atualizar = useCallback(async () => {
    try {
      const visao = await obterEstadoBloqueio();
      if (!visao || visao.estado.fase !== 'COOLDOWN') {
        setMinutosRestantes(null);
        return;
      }
      setMinutosRestantes(minutosRestantesCooldown(visao.estado, Date.now()));
    } catch (erro) {
      registrarErro(erro as Error, 'useCooldownRestante.atualizar');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      atualizar();
      const intervalo = setInterval(atualizar, 60_000);
      return () => clearInterval(intervalo);
    }, [atualizar]),
  );

  return { minutosRestantes };
}
