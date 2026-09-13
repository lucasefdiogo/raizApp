import { useCallback, useEffect, useRef, useState } from 'react';
import { buscarUsuario } from '../services/firestore';
import {
  agendarLembreteDiario,
  avaliarNecessidadeAlertaRisco,
  solicitarPermissao,
} from '../services/notifications';
import { STORAGE_KEYS, lerItem, salvarItem } from '../utils/storage';

interface UseLocalNotificationsResultado {
  avaliarAlertaRisco: (essencialConcluidaHoje: boolean) => void;
  /**
   * true na primeira vez que o boot chega até aqui sem
   * notification_priming_shown gravado — quem chama deve mostrar a
   * NotificationPrimingScreen em vez de Main, e só liberar a navegação
   * chamando concluirPriming.
   */
  deveExibirPriming: boolean;
  /**
   * Chamada pelos dois botões da NotificationPrimingScreen (permitir ou
   * "Agora não") — grava notification_priming_shown de qualquer forma, pra
   * nunca mais repetir a tela. Só dispara o diálogo nativo
   * (solicitarPermissao) quando `permitiuNotificacoes` é true.
   */
  concluirPriming: (permitiuNotificacoes: boolean) => Promise<void>;
}

/**
 * Configura o lembrete diário uma única vez no boot, quando `pronto` (o
 * usuário já está autenticado e com onboarding completo). Antes de pedir a
 * permissão nativa de notificação pela primeira vez, checa se a
 * NotificationPrimingScreen já foi mostrada (notification_priming_shown em
 * AsyncStorage) — se ainda não, expõe deveExibirPriming em vez de chamar
 * solicitarPermissao() direto, e é a tela (via concluirPriming) quem decide
 * se o pedido nativo acontece. Depois da primeira vez, os boots seguintes
 * voltam a chamar solicitarPermissao() direto aqui, como sempre — só o
 * pedido inicial passa pela explicação.
 *
 * avaliarAlertaRisco é chamável repetidamente (toda vez que uma tarefa
 * muda) sem se preocupar com duplicar agendamentos — quem evita duplicata é
 * avaliarNecessidadeAlertaRisco em services/notifications.ts, que sempre
 * cancela o agendamento anterior de hoje antes de decidir se recria.
 */
export function useLocalNotifications(
  uid: string | null,
  pronto: boolean,
): UseLocalNotificationsResultado {
  const jaConfiguradoRef = useRef(false);
  const [deveExibirPriming, setDeveExibirPriming] = useState(false);

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

      const primingJaMostrado = await lerItem<boolean>(
        STORAGE_KEYS.notificationPrimingShown,
      );
      if (!primingJaMostrado) {
        setDeveExibirPriming(true);
        return;
      }

      await solicitarPermissao();
      await agendarLembreteDiario(usuario.horarioLembreteDiario);
    }

    configurar();
  }, [pronto, uid]);

  const concluirPriming = useCallback(
    async (permitiuNotificacoes: boolean) => {
      await salvarItem(STORAGE_KEYS.notificationPrimingShown, true);
      setDeveExibirPriming(false);

      if (permitiuNotificacoes) {
        await solicitarPermissao();
      }

      if (!uid) {
        return;
      }
      const usuario = await buscarUsuario(uid);
      if (usuario?.notificacoesAtivas && usuario.horarioLembreteDiario) {
        await agendarLembreteDiario(usuario.horarioLembreteDiario);
      }
    },
    [uid],
  );

  const avaliarAlertaRisco = useCallback((essencialConcluidaHoje: boolean) => {
    avaliarNecessidadeAlertaRisco(essencialConcluidaHoje);
  }, []);

  return { avaliarAlertaRisco, deveExibirPriming, concluirPriming };
}
