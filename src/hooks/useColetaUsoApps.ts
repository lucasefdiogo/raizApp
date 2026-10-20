import { useEffect } from 'react';
import { AppState } from 'react-native';
import { agregarUsoPorDia } from '../domain/usoApps';
import { buscarUsuario, gravarUsoAppsNoDia } from '../services/firestore';
import { lerEventosUso, temAcessoUso } from '../native/UsoApps';
import { registrarErro } from '../services/crashlytics';

// Hoje e os 6 dias anteriores.
const DIAS_RETROATIVOS = 6;

/**
 * Roda na montagem (Home) e a cada vez que o app volta ao primeiro plano —
 * o que cobre voltar das configurações com o acesso recém-concedido
 * (RN-05). Só uma coleta por vez: um evento durante outra é ignorado. Lê os eventos de uso
 * dos últimos 7 dias, agrega por dia e grava `usoApps` em cada dailyLog
 * (HU-02, RN-04). Recalcula a janela inteira, então rodar de novo não muda
 * o resultado.
 *
 * Silencioso de propósito (RN-06): sem consentimentoAcessoUso gravado ou sem
 * o acesso de uso concedido no sistema, não lê nem grava nada, e uma falha
 * só vai para o Crashlytics — nunca atrapalha a Home nem o bloqueio de apps.
 */
export function useColetaUsoApps(uid: string): void {
  useEffect(() => {
    let cancelado = false;
    let emAndamento = false;

    async function coletar() {
      if (emAndamento) {
        return;
      }
      emAndamento = true;
      try {
        const usuario = await buscarUsuario(uid);
        if (cancelado || !usuario?.consentimentoAcessoUso) {
          return;
        }
        if (!(await temAcessoUso()) || cancelado) {
          return;
        }

        const agora = new Date();
        const inicioMs = new Date(
          agora.getFullYear(),
          agora.getMonth(),
          agora.getDate() - DIAS_RETROATIVOS,
        ).getTime();
        const fimMs = agora.getTime();

        const eventos = await lerEventosUso(inicioMs, fimMs);
        if (cancelado) {
          return;
        }

        const porDia = agregarUsoPorDia(eventos, inicioMs, fimMs);
        for (const [dia, uso] of Object.entries(porDia)) {
          if (cancelado) {
            return;
          }
          await gravarUsoAppsNoDia(uid, dia, uso);
        }
      } catch (erro) {
        registrarErro(erro as Error, 'useColetaUsoApps');
      } finally {
        emAndamento = false;
      }
    }

    coletar();
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        coletar();
      }
    });

    return () => {
      cancelado = true;
      assinatura.remove();
    };
  }, [uid]);
}
