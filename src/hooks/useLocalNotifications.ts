import { useCallback, useEffect, useRef } from 'react';
import { buscarUsuario } from '../services/firestore';
import {
  agendarLembreteDiario,
  avaliarNecessidadeAlertaRisco,
  solicitarPermissao,
} from '../services/notifications';

interface UseLocalNotificationsResultado {
  avaliarAlertaRisco: (essencialConcluidaHoje: boolean) => void;
}

/**
 * Configura o lembrete diário uma única vez no boot, quando `pronto` (o
 * usuário já está autenticado e com onboarding completo — nunca pede
 * permissão de notificação antes disso). avaliarAlertaRisco é chamável
 * repetidamente (toda vez que uma tarefa muda) sem se preocupar com
 * duplicar agendamentos — quem evita duplicata é
 * avaliarNecessidadeAlertaRisco em services/notifications.ts, que sempre
 * cancela o agendamento anterior de hoje antes de decidir se recria.
 */
export function useLocalNotifications(
  uid: string | null,
  pronto: boolean,
): UseLocalNotificationsResultado {
  const jaConfiguradoRef = useRef(false);

  useEffect(() => {
    if (!pronto || !uid || jaConfiguradoRef.current) {
      return;
    }
    jaConfiguradoRef.current = true;

    async function configurar() {
      const usuario = await buscarUsuario(uid as string);
      if (!usuario?.notificacoesAtivas || !usuario.horarioLembreteDiario) {
        return;
      }

      await solicitarPermissao();
      await agendarLembreteDiario(usuario.horarioLembreteDiario);
    }

    configurar();
  }, [pronto, uid]);

  const avaliarAlertaRisco = useCallback((essencialConcluidaHoje: boolean) => {
    avaliarNecessidadeAlertaRisco(essencialConcluidaHoje);
  }, []);

  return { avaliarAlertaRisco };
}
