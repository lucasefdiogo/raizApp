import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { temAcessoUso } from '../native/UsoApps';

interface UseAcessoUsoResultado {
  /** true só quando o acesso de uso está concedido ao Rootora no sistema. */
  concedido: boolean;
  carregando: boolean;
}

/**
 * Status real do acesso de uso (HU-02). A concessão é manual nas
 * configurações do Android, então reavalia quando o app volta ao primeiro
 * plano, como useAccessibilityPermission.
 */
export function useAcessoUso(): UseAcessoUsoResultado {
  const [concedido, setConcedido] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const verificar = useCallback(async () => {
    setConcedido(await temAcessoUso());
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

  return { concedido, carregando };
}
