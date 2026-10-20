import { useEffect } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import {
  consumirDestinoNotificacao,
  EVENTO_DESTINO_NOTIFICACAO,
} from '../native/DestinoNotificacao';
import { registrarErro } from '../services/crashlytics';

const ORIGEM = 'useAbrirDestinoDaNotificacao';
const DESTINO_BLOQUEIO_APPS = 'bloqueio-apps';

/**
 * Runs on mount (Home), every time the app returns to the foreground and
 * whenever the native side emits EVENTO_DESTINO_NOTIFICACAO (reminder tapped
 * while the app is already open, no AppState change).
 * Consumes the destination left by the tapped "blocking off" reminder
 * (HU-03, RN-05) and, when it is 'bloqueio-apps', opens the Bloqueio de apps
 * screen. The native side clears the destination on read, so it is handled
 * once. Unknown or missing destination: no navigation. One run at a time;
 * a trigger that arrives during a run is not dropped: it schedules one more
 * run right after (the in-flight read may have happened before the new
 * destination was stored).
 *
 * Silent: failures only go to Crashlytics.
 */
export function useAbrirDestinoDaNotificacao(): void {
  const navigation = useNavigation();

  useEffect(() => {
    let cancelado = false;
    let emAndamento = false;
    let repetir = false;

    async function abrir() {
      if (emAndamento) {
        repetir = true;
        return;
      }
      emAndamento = true;
      try {
        const destino = await consumirDestinoNotificacao();
        if (cancelado || destino !== DESTINO_BLOQUEIO_APPS) {
          return;
        }
        navigation.dispatch(
          CommonActions.navigate({
            name: 'PerfilTab',
            params: { screen: 'BloqueioApps' },
          }),
        );
      } catch (erro) {
        registrarErro(erro as Error, ORIGEM);
      } finally {
        emAndamento = false;
        if (repetir && !cancelado) {
          repetir = false;
          abrir();
        }
      }
    }

    abrir();
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        abrir();
      }
    });

    const assinaturaEvento = DeviceEventEmitter.addListener(
      EVENTO_DESTINO_NOTIFICACAO,
      abrir,
    );

    return () => {
      cancelado = true;
      assinatura.remove();
      assinaturaEvento.remove();
    };
  }, [navigation]);
}
