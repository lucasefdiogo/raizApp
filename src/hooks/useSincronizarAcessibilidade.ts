import { useEffect } from 'react';
import { AppState } from 'react-native';
import { agruparEventosPorDia } from '../domain/acessibilidade';
import { buscarUsuario, gravarAcessibilidadeNoDia } from '../services/firestore';
import {
  espelharNotificacoesAtivas,
  lerEventosAcessibilidadePendentes,
  marcarEventosAcessibilidadeEnviados,
  verificarDesligamentoNaAbertura,
} from '../native/EventosAcessibilidade';
import { registrarErro } from '../services/crashlytics';

const ORIGEM = 'useSincronizarAcessibilidade';

/**
 * Runs on mount (Home) and every time the app returns to the foreground.
 * One run at a time. Each run (HU-03):
 * 1. mirrors `notificacoesAtivas` to the native side (RN-03);
 * 2. asks the native side to check whether the service is off (RN-06);
 * 3. writes the pending service events to each local day's dailyLog (RN-07);
 * 4. only if every write succeeded, marks them as sent. A failed write leaves
 *    them pending; resending is safe because arrayUnion does not duplicate.
 *
 * Silent: failures only go to Crashlytics. Steps 1 and 2 have their own
 * try/catch so a mirror/check problem never blocks sending pending events.
 */
export function useSincronizarAcessibilidade(uid: string): void {
  useEffect(() => {
    let cancelado = false;
    let emAndamento = false;

    async function sincronizar() {
      if (emAndamento) {
        return;
      }
      emAndamento = true;
      try {
        try {
          const usuario = await buscarUsuario(uid);
          if (usuario) {
            espelharNotificacoesAtivas(usuario.notificacoesAtivas);
          }
        } catch (erro) {
          registrarErro(erro as Error, ORIGEM);
        }
        if (cancelado) {
          return;
        }

        try {
          await verificarDesligamentoNaAbertura();
        } catch (erro) {
          registrarErro(erro as Error, ORIGEM);
        }
        if (cancelado) {
          return;
        }

        const eventos = await lerEventosAcessibilidadePendentes();
        if (cancelado || eventos.length === 0) {
          return;
        }

        const porDia = agruparEventosPorDia(eventos);
        for (const [dia, dados] of Object.entries(porDia)) {
          if (cancelado) {
            return;
          }
          await gravarAcessibilidadeNoDia(uid, dia, dados);
        }
        await marcarEventosAcessibilidadeEnviados(eventos.map((e) => e.id));
      } catch (erro) {
        registrarErro(erro as Error, ORIGEM);
      } finally {
        emAndamento = false;
      }
    }

    sincronizar();
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        sincronizar();
      }
    });

    return () => {
      cancelado = true;
      assinatura.remove();
    };
  }, [uid]);
}
