import { useEffect } from 'react';
import { AppState } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { consumirDestinoNotificacao } from '../native/DestinoNotificacao';
import { registrarErro } from '../services/crashlytics';

const ORIGEM = 'useAbrirDestinoDaNotificacao';
const DESTINO_BLOQUEIO_APPS = 'bloqueio-apps';

/**
 * Runs on mount (Home) and every time the app returns to the foreground.
 * Consumes the destination left by the tapped "blocking off" reminder
 * (HU-03, RN-05) and, when it is 'bloqueio-apps', opens the Bloqueio de apps
 * screen. The native side clears the destination on read, so it is handled
 * once. Unknown or missing destination: no navigation. One run at a time.
 *
 * Known limitation: a notification tapped while the app is already in the
 * foreground (no AppState change) is only handled on the next activation.
 *
 * Silent: failures only go to Crashlytics.
 */
export function useAbrirDestinoDaNotificacao(): void {
  const navigation = useNavigation();

  useEffect(() => {
    let cancelado = false;
    let emAndamento = false;

    async function abrir() {
      if (emAndamento) {
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
      }
    }

    abrir();
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        abrir();
      }
    });

    return () => {
      cancelado = true;
      assinatura.remove();
    };
  }, [navigation]);
}
