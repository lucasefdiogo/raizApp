import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  isAccessibilityServiceEnabled,
  openAccessibilitySettings,
} from '../native/AccessibilityDetection';
import { logPermissaoAccessibility } from '../services/analytics';

interface UseAccessibilityPermissionResultado {
  /** true só quando o Accessibility Service do Rootora está habilitado. */
  ativo: boolean;
  carregando: boolean;
  /** Reavalia sob demanda (ex: pull-to-refresh de quem usa este hook). */
  verificarNovamente: () => Promise<void>;
  /** Abre a tela de Acessibilidade do sistema — habilitar é manual lá. */
  abrirConfiguracoes: () => void;
}

/**
 * Pré-requisito pro bloqueio de apps funcionar (ver
 * RootoraAccessibilityService.kt) — sem isso o app nunca detecta troca de
 * app em primeiro plano. Reavalia sozinho quando o Rootora volta pro
 * primeiro plano: habilitar o serviço é uma ação manual nas Configurações
 * do Android, então o usuário sai do app, ativa lá, e volta — a tela nunca
 * perde foco de navegação nesse fluxo (o processo inteiro só volta do
 * background), então useFocusEffect não cobre esse caso; AppState cobre.
 */
export function useAccessibilityPermission(): UseAccessibilityPermissionResultado {
  const [ativo, setAtivo] = useState(false);
  const [carregando, setCarregando] = useState(true);
  // Só loga em transições reais depois da 1ª checagem — sem isso, toda volta
  // do app pro primeiro plano (AppState 'active') dispararia o evento de
  // novo, mesmo sem o usuário ter mudado nada nas Configurações.
  const primeiraChecagemFeitaRef = useRef(false);
  const valorAnteriorRef = useRef<boolean | null>(null);

  const verificar = useCallback(async () => {
    const resultado = await isAccessibilityServiceEnabled();
    if (
      primeiraChecagemFeitaRef.current &&
      valorAnteriorRef.current !== resultado
    ) {
      logPermissaoAccessibility(resultado);
    }
    primeiraChecagemFeitaRef.current = true;
    valorAnteriorRef.current = resultado;
    setAtivo(resultado);
    setCarregando(false);
  }, []);

  useEffect(() => {
    verificar();
  }, [verificar]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', estado => {
      if (estado === 'active') {
        verificar();
      }
    });
    return () => subscription.remove();
  }, [verificar]);

  return {
    ativo,
    carregando,
    verificarNovamente: verificar,
    abrirConfiguracoes: openAccessibilitySettings,
  };
}
