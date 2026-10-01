import { useEffect } from 'react';
import { aplicarRegrasBloqueioPendentesSeVencidas } from '../domain/appBlock';
import { hojeISOLocal } from '../domain/data';
import { buscarUsuario, promoverRegrasBloqueioPendentes } from '../services/firestore';
import {
  salvarRegrasBloqueio as salvarRegrasBloqueioNativo,
  salvarRegrasBloqueioPendentes as salvarRegrasBloqueioPendentesNativo,
} from '../native/AccessibilityDetection';
import { registrarErro } from '../services/crashlytics';

/**
 * Roda uma vez por abertura do app (montada na Home, a aba padrão) pra
 * manter duas coisas em dia, sem bloquear a UI:
 *
 * 1. Espelha regrasBloqueio/regrasBloqueioPendentes em SharedPreferences —
 *    o AccessibilityService lê de lá, não do Firestore (roda fora do ciclo
 *    de vida do React).
 * 2. Se uma pendência já venceu (ver aplicarRegrasBloqueioPendentesSeVencidas,
 *    mesma regra que o Kotlin reimplementa em BloqueioPrefs pra funcionar
 *    com o app fechado), grava a promoção de volta no Firestore —
 *    regrasBloqueio atualizado, regrasBloqueioPendentes nulo — pra a tela
 *    de configuração e qualquer outro dispositivo verem o estado correto.
 *
 * Silencioso de propósito: sem usuário configurado ainda (regrasBloqueio
 * nunca existiu), não faz nada.
 */
export function useSincronizarRegrasBloqueio(uid: string): void {
  useEffect(() => {
    let cancelado = false;

    async function sincronizar() {
      try {
        const usuario = await buscarUsuario(uid);
        if (cancelado || !usuario?.regrasBloqueio) {
          return;
        }

        const resolvido = aplicarRegrasBloqueioPendentesSeVencidas(
          usuario.regrasBloqueio,
          usuario.regrasBloqueioPendentes ?? null,
          hojeISOLocal(),
        );

        salvarRegrasBloqueioNativo(resolvido.regrasBloqueio);
        salvarRegrasBloqueioPendentesNativo(resolvido.regrasBloqueioPendentes);

        const pendenciaFoiPromovida =
          usuario.regrasBloqueioPendentes != null && resolvido.regrasBloqueioPendentes === null;
        if (pendenciaFoiPromovida) {
          await promoverRegrasBloqueioPendentes(uid, resolvido.regrasBloqueio);
        }
      } catch (erro) {
        registrarErro(erro as Error, 'useSincronizarRegrasBloqueio');
      }
    }

    sincronizar();

    return () => {
      cancelado = true;
    };
  }, [uid]);
}
