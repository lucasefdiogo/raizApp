import { useCallback, useEffect, useState } from 'react';
import { atualizarPerfilUsuario, buscarUsuario } from '../services/firestore';
import {
  agendarLembreteDiario,
  avaliarNecessidadeAlertaRisco,
  cancelarLembreteDiario,
} from '../services/notifications';

interface UsePerfilResultado {
  porqueTexto: string;
  notificacoesAtivas: boolean;
  horarioLembreteDiario: string | null;
  carregando: boolean;
  salvarPorque: (texto: string) => Promise<void>;
  alternarNotificacoes: (ativo: boolean) => Promise<void>;
  alterarHorario: (horario: string) => Promise<void>;
}

/**
 * Lê users/{uid} via buscarUsuario — a mesma função que buscarEstadoStreak
 * (usada por useStreak) e useOnboardingStatus/useReturnAfterPause já
 * chamam, sem abrir uma terceira leitura independente do mesmo documento.
 * A orquestração Firestore <-> services/notifications.ts vive aqui, não na
 * tela (mesmo padrão de useAuth pra Auth <-> Firestore).
 */
export function usePerfil(uid: string): UsePerfilResultado {
  const [porqueTexto, setPorqueTexto] = useState('');
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(false);
  const [horarioLembreteDiario, setHorarioLembreteDiario] = useState<
    string | null
  >(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const usuario = await buscarUsuario(uid);
      if (!cancelado) {
        if (usuario) {
          setPorqueTexto(usuario.porqueTexto ?? '');
          setNotificacoesAtivas(usuario.notificacoesAtivas);
          setHorarioLembreteDiario(usuario.horarioLembreteDiario);
        }
        setCarregando(false);
      }
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [uid]);

  const salvarPorque = useCallback(
    async (texto: string) => {
      await atualizarPerfilUsuario(uid, { porqueTexto: texto });
      setPorqueTexto(texto);
    },
    [uid],
  );

  const alternarNotificacoes = useCallback(
    async (ativo: boolean) => {
      await atualizarPerfilUsuario(uid, { notificacoesAtivas: ativo });
      setNotificacoesAtivas(ativo);

      if (ativo) {
        if (horarioLembreteDiario) {
          await agendarLembreteDiario(horarioLembreteDiario);
        }
      } else {
        await cancelarLembreteDiario();
        // Reaproveita avaliarNecessidadeAlertaRisco em vez de uma função de
        // cancelamento própria — chamada com essencialConcluidaHoje: true
        // ela sempre cancela o alerta de risco pendente de hoje sem recriar.
        await avaliarNecessidadeAlertaRisco(true);
      }
    },
    [uid, horarioLembreteDiario],
  );

  const alterarHorario = useCallback(
    async (horario: string) => {
      await atualizarPerfilUsuario(uid, { horarioLembreteDiario: horario });
      setHorarioLembreteDiario(horario);

      if (notificacoesAtivas) {
        await agendarLembreteDiario(horario);
      }
    },
    [uid, notificacoesAtivas],
  );

  return {
    porqueTexto,
    notificacoesAtivas,
    horarioLembreteDiario,
    carregando,
    salvarPorque,
    alternarNotificacoes,
    alterarHorario,
  };
}
