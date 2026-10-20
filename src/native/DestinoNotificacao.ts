import { NativeModules } from 'react-native';

/** Event emitted by MainActivity.onNewIntent when a reminder is tapped with the app already open. */
export const EVENTO_DESTINO_NOTIFICACAO = 'destino-notificacao';

interface RootoraAccessibilityNative {
  consumirDestinoNotificacao(): Promise<string | null>;
}

/** Read on every call (not on load): the module may be absent (old build, Jest). */
function moduloNativo(): RootoraAccessibilityNative | undefined {
  return NativeModules.RootoraAccessibility as
    | RootoraAccessibilityNative
    | undefined;
}

/**
 * Native contract (HU-03, RN-05): returns the destination left by the tapped
 * reminder notification (e.g. 'bloqueio-apps') and clears it, so a second
 * call returns null. Without the native module resolves null.
 */
export async function consumirDestinoNotificacao(): Promise<string | null> {
  const modulo = moduloNativo();
  return modulo ? (await modulo.consumirDestinoNotificacao()) ?? null : null;
}
