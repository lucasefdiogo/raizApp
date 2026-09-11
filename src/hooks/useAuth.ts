import { useCallback, useEffect, useState } from 'react';
import type { User } from '@react-native-firebase/auth';
import * as authService from '../services/auth';
import {
  criarDocumentoUsuario,
  preencherNomeSeVazio,
} from '../services/firestore';
import { mapearErroAuth } from '../domain/authErrors';

function erroMapeado(erro: unknown): Error {
  const codigo = (erro as { code?: string } | undefined)?.code;
  return new Error(mapearErroAuth(codigo));
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(usuario => {
      setUser(usuario);
      setCarregando(false);
    });
    return unsubscribe;
  }, []);

  const signUp = useCallback(
    async (email: string, senha: string, nome: string) => {
      try {
        const credential = await authService.signUpWithEmail(email, senha);
        await criarDocumentoUsuario(credential.user.uid, email, nome);
      } catch (erro) {
        throw erroMapeado(erro);
      }
    },
    [],
  );

  const signIn = useCallback(async (email: string, senha: string) => {
    try {
      await authService.signInWithEmail(email, senha);
    } catch (erro) {
      throw erroMapeado(erro);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const credential = await authService.signInWithGoogle();
      if (credential) {
        // displayName vem da própria conta Google — não pedimos de novo
        // nesse fluxo. criarDocumentoUsuario só grava na primeira vez
        // (idempotente), então contas Google já existentes antes dessa
        // mudança precisam do preencherNomeSeVazio abaixo pra ganhar o
        // nome também — roda em todo login, não só no cadastro.
        await criarDocumentoUsuario(
          credential.user.uid,
          credential.user.email ?? '',
          credential.user.displayName ?? '',
        );
        await preencherNomeSeVazio(
          credential.user.uid,
          credential.user.displayName ?? '',
        );
      }
    } catch (erro) {
      throw erroMapeado(erro);
    }
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await authService.sendPasswordReset(email);
    } catch (erro) {
      const codigo = (erro as { code?: string } | undefined)?.code;
      if (codigo === 'auth/user-not-found') {
        // Não revela se o e-mail tem conta ou não.
        return;
      }
      throw erroMapeado(erro);
    }
  }, []);

  return {
    user,
    carregando,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
  };
}
