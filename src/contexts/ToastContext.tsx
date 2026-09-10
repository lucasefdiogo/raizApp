import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Toast } from '../components/common/Toast';

export const DURACAO_TOAST_MS = 3000;

export interface ToastContextValue {
  showToast: (mensagem: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastProviderProps {
  children: React.ReactNode;
}

/**
 * Mantém no máximo 1 toast visível. Disparar outro enquanto um já está na
 * tela substitui a mensagem (não empilha) e reinicia o cronômetro — aviso
 * de erro de rede não é importante o bastante pra justificar fila. Some
 * sozinho depois de DURACAO_TOAST_MS ou ao toque (onFechar do Toast).
 *
 * Fica em App.tsx, acima da navegação, pra funcionar em qualquer tela.
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [mensagem, setMensagem] = useState<string | null>(null);
  const temporizadorRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limparTemporizador = useCallback(() => {
    if (temporizadorRef.current !== null) {
      clearTimeout(temporizadorRef.current);
      temporizadorRef.current = null;
    }
  }, []);

  const esconder = useCallback(() => {
    limparTemporizador();
    setMensagem(null);
  }, [limparTemporizador]);

  const showToast = useCallback(
    (novaMensagem: string) => {
      limparTemporizador();
      setMensagem(novaMensagem);
      temporizadorRef.current = setTimeout(() => {
        temporizadorRef.current = null;
        setMensagem(null);
      }, DURACAO_TOAST_MS);
    },
    [limparTemporizador],
  );

  useEffect(() => limparTemporizador, [limparTemporizador]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mensagem !== null && <Toast mensagem={mensagem} onFechar={esconder} />}
    </ToastContext.Provider>
  );
}
