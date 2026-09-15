import {
  crash,
  getCrashlytics,
  recordError,
  setUserId as definirUsuarioIdNoCrashlytics,
} from '@react-native-firebase/crashlytics';

function crashlytics() {
  return getCrashlytics();
}

/**
 * Registra um erro já tratado (catch existente que hoje só loga no console
 * ou mostra Toast) sem mudar o comportamento visível pro usuário — chamar
 * ANTES do tratamento já existente, nunca no lugar dele. `contexto`
 * identifica de qual função/fluxo veio, já que recordError sozinho não diz
 * onde o catch aconteceu.
 */
export function registrarErro(erro: Error, contexto?: string): void {
  recordError(crashlytics(), erro, contexto);
}

/**
 * Associa relatórios de crash ao usuário logado — só o uid (identificador
 * opaco do Firebase Auth, sem PII). `null` (logout/exclusão de conta) grava
 * string vazia, já que o SDK nativo não aceita null pra "sem usuário".
 */
export function setUsuarioId(uid: string | null): void {
  definirUsuarioIdNoCrashlytics(crashlytics(), uid ?? '');
}

/**
 * Só acessível em __DEV__ (ver botão condicional na PerfilScreen) — força
 * um crash de verdade pra validar que a integração está funcionando de
 * ponta a ponta (o relatório aparece no Firebase Console depois de reabrir
 * o app uma vez).
 */
export function testarCrash(): void {
  if (!__DEV__) {
    return;
  }
  crash(crashlytics());
}
