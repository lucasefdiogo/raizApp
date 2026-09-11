import { useEffect, useState } from 'react';
import { buscarUsuario } from '../services/firestore';

/**
 * Só o nome do usuário (users/{uid}.nome), pra saudação da Home. Lê a
 * mesma fonte (buscarUsuario) que usePerfil e useStreak já leem — isolado
 * num hook próprio em vez de estender usePerfil, que carrega estado e
 * ações (porquê, notificações, horário) que não fazem sentido pra Home.
 * Ausente/'' (default do documento) mantém a string vazia — quem exibe
 * decide como tratar isso (ver HomeHeader).
 */
export function useNomeUsuario(uid: string): string {
  const [nome, setNome] = useState('');

  useEffect(() => {
    let cancelado = false;

    buscarUsuario(uid).then(usuario => {
      if (!cancelado && usuario) {
        setNome(usuario.nome);
      }
    });

    return () => {
      cancelado = true;
    };
  }, [uid]);

  return nome;
}
