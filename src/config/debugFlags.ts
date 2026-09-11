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
 */
export const MOSTRAR_DEBUG_ACESSIBILIDADE = false;
