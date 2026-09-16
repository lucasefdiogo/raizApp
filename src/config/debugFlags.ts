/**
 * Flags de build pra validação em device. NÃO são feature flags de produto.
 *
 * MOSTRAR_DEBUG_ACESSIBILIDADE: expõe o atalho pra AccessibilityDebugScreen
 * (Fase 3, parte 1) mesmo em build release — necessário porque o teste
 * manual do Accessibility Service tem que rodar em hardware real e, neste
 * ambiente (Metro no WSL, adb do Windows), um build debug no celular físico
 * não alcança o Metro. Mantido `false` no repositório: só é ligado à mão
 * pra gerar o APK de teste. Sai junto com a AccessibilityDebugScreen numa
 * tarefa futura.
 *
 * MOSTRAR_TESTAR_CRASHLYTICS: mesmo motivo — o botão "Testar Crashlytics" e
 * testarCrash() em si só rodam em `__DEV__`, que uma build release sempre
 * zera independente da assinatura. Ligar à mão só pra gerar o APK de teste
 * de Crashlytics/Analytics, nunca commitar como `true`.
 */
export const MOSTRAR_DEBUG_ACESSIBILIDADE = false;
export const MOSTRAR_TESTAR_CRASHLYTICS = false;
