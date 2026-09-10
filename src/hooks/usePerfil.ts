import { useCallback, useEffect, useState } from 'react';
import { atualizarPerfilUsuario, buscarUsuario } from '../services/firestore';
import {
  agendarLembreteDiario,
  avaliarNecessidadeAlertaRisco,
  cancelarLembreteDiario,
} from '../services/notifications';
import { useToast } from './useToast';

const MENSAGEM_FALHA_PORQUE =
  'Não conseguimos salvar seu porquê agora. Tente de novo.';
const MENSAGEM_FALHA_NOTIFICACOES =
  'Não conseguimos atualizar as notificações agora. Tente de novo.';
const MENSAGEM_FALHA_HORARIO =
  'Não conseguimos salvar o horário agora. Tente de novo.';

interface UsePerfilResultado {
  porqueTexto: string;
  notificacoesAtivas: boolean;
  horarioLembreteDiario: string | null;
  carregando: boolean;
  /** Resolve `true` se gravou, `false` se falhou (toast já foi disparado). */
  salvarPorque: (texto: string) => Promise<boolean>;
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
  const { showToast } = useToast();
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
    async (texto: string): Promise<boolean> => {
      try {
        await atualizarPerfilUsuario(uid, { porqueTexto: texto });
        setPorqueTexto(texto);
        return true;
      } catch {
        showToast(MENSAGEM_FALHA_PORQUE);
        return false;
      }
    },
    [uid, showToast],
  );

  const alternarNotificacoes = useCallback(
    async (ativo: boolean) => {
      try {
        await atualizarPerfilUsuario(uid, { notificacoesAtivas: ativo });
        setNotificacoesAtivas(ativo);

        if (ativo) {
          if (horarioLembreteDiario) {
            await agendarLembreteDiario(horarioLembreteDiario);
          }
        } else {
          await cancelarLembreteDiario();
          // Reaproveita avaliarNecessidadeAlertaRisco em vez de uma função
          // de cancelamento própria — chamada com essencialConcluidaHoje:
          // true ela sempre cancela o alerta de risco pendente de hoje sem
          // recriar.
          await avaliarNecessidadeAlertaRisco(true);
        }
      } catch {
        showToast(MENSAGEM_FALHA_NOTIFICACOES);
      }
    },
    [uid, horarioLembreteDiario, showToast],
  );

  const alterarHorario = useCallback(
    async (horario: string) => {
      try {
        await atualizarPerfilUsuario(uid, { horarioLembreteDiario: horario });
        setHorarioLembreteDiario(horario);

        if (notificacoesAtivas) {
          await agendarLembreteDiario(horario);
        }
      } catch {
        showToast(MENSAGEM_FALHA_HORARIO);
      }
    },
    [uid, notificacoesAtivas, showToast],
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
