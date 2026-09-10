import { useContext } from 'react';
import { ToastContext, ToastContextValue } from '../contexts/ToastContext';

/**
 * Acesso ao toast global. Expõe { showToast(mensagem) }. Precisa estar
 * dentro de um <ToastProvider> (que vive em App.tsx).
 */
export function useToast(): ToastContextValue {
  const contexto = useContext(ToastContext);
  if (contexto === null) {
    throw new Error('useToast precisa estar dentro de um <ToastProvider>');
  }
  return contexto;
}
