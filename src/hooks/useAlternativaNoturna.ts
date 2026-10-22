import { useEffect, useState } from 'react';
import { buscarUsuario } from '../services/firestore';

/**
 * Só `users/{uid}.rotina.alternativaNoturna` (HU-07, RN07) — mesma fonte
 * que `useNomeUsuario` já lê, isolado num hook próprio em vez de reusar
 * `useRotina`, que carrega estimativa/confirmação e não faz sentido pra
 * Home. Ausente (sem rotina ou sem a alternativa definida) resolve null.
 */
export function useAlternativaNoturna(uid: string): string | null {
  const [alternativaNoturna, setAlternativaNoturna] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelado = false;

    buscarUsuario(uid).then(usuario => {
      if (!cancelado) {
        setAlternativaNoturna(usuario?.rotina?.alternativaNoturna ?? null);
      }
    });

    return () => {
      cancelado = true;
    };
  }, [uid]);

  return alternativaNoturna;
}
