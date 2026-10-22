/**
 * Flags de build pra validação em device. NÃO são feature flags de produto.
 *
 * MOSTRAR_TESTAR_CRASHLYTICS: o botão "Testar Crashlytics" e testarCrash()
 * em si só rodam em `__DEV__`, que uma build release sempre zera
 * independente da assinatura — e, neste ambiente (Metro no WSL, adb do
 * Windows), um build debug no celular físico não alcança o Metro. Ligar à
 * mão só pra gerar o APK de teste de Crashlytics/Analytics, nunca commitar
 * como `true`.
 */
export const MOSTRAR_TESTAR_CRASHLYTICS = false;
