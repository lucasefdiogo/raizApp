import { useCallback, useState } from 'react';
import * as authService from '../services/auth';
import type { ProvedorConta } from '../services/auth';
import { apagarTodosOsDadosDoUsuario } from '../services/firestore';
import { cancelarTodasNotificacoes } from '../services/notifications';
import { useToast } from './useToast';

const MENSAGEM_FALHA_LIMPEZA =
  'Não foi possível concluir a exclusão agora. Tente de novo.';
const MENSAGEM_FALHA_ENCERRAR_ACESSO =
  'Seus dados foram removidos, mas o acesso não foi encerrado agora. Saia e entre de novo para concluir.';
const MENSAGEM_SEM_USUARIO =
  'Sua sessão expirou. Entre de novo para excluir a conta.';
const MENSAGEM_SENHA_INCORRETA = 'Senha incorreta. Tente de novo.';
const MENSAGEM_FALHA_REAUTENTICACAO =
  'Não foi possível confirmar sua identidade agora. Tente de novo.';

interface UseAccountDeletionResultado {
  /** Dispara a sequência completa de exclusão (passos 1–6). */
  excluirConta: () => Promise<void>;
  /** true quando o Auth exigiu login recente e o hook está aguardando a reautenticação. */
  precisaReautenticar: boolean;
  /** Provedor da conta atual — a UI usa pra decidir entre pedir senha ou refazer o Google. */
  provedor: ProvedorConta | null;
  /** Reautentica e retoma a exclusão a partir do passo 5. `senha` só é usada em conta e-mail/senha. */
  reautenticar: (senha?: string) => Promise<void>;
  /** Fecha o fluxo de reautenticação sem concluir (os dados do Firestore já foram apagados). */
  cancelarReautenticacao: () => void;
  carregando: boolean;
  erro: string | null;
}

/**
 * Orquestra a exclusão de conta ponta a ponta:
 *  1–3. apaga dados do usuário no Firestore (subcoleções e depois users/{uid})
 *  4.   cancela notificações locais
 *  5.   apaga a conta no Firebase Auth
 *  6.   a navegação pro AuthStack é automática — o listener onAuthStateChanged
 *       do useAuth detecta a remoção. Nada de navegação manual aqui.
 *
 * Se o passo 5 pedir login recente (auth/requires-recent-login), o hook pausa
 * em `precisaReautenticar`, espera `reautenticar()` e retoma do passo 5 — os
 * passos 1–4 não são refeitos. Erros de rede caem no Toast e a sequência para
 * onde está, sem rollback.
 */
export function useAccountDeletion(): UseAccountDeletionResultado {
  const { showToast } = useToast();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [precisaReautenticar, setPrecisaReautenticar] = useState(false);
  const [provedor, setProvedor] = useState<ProvedorConta | null>(null);

  /** Passo 5. Trata só o resultado; requires-recent-login é decidido por quem chama. */
  const apagarContaAuth = useCallback(async () => {
    await authService.excluirContaAuth();
    // Passo 6 acontece sozinho via onAuthStateChanged.
  }, []);

  const excluirConta = useCallback(async () => {
    const usuario = authService.getCurrentUser();
    if (!usuario) {
      setErro(null);
      showToast(MENSAGEM_SEM_USUARIO);
      return;
    }

    setCarregando(true);
    setErro(null);

    // Passos 1–4: limpeza que exige Auth válido.
    try {
      await apagarTodosOsDadosDoUsuario(usuario.uid);
      await cancelarTodasNotificacoes();
    } catch {
      setCarregando(false);
      showToast(MENSAGEM_FALHA_LIMPEZA);
      return;
    }

    // Passo 5.
    try {
      await apagarContaAuth();
    } catch (erroAuth) {
      const codigo = (erroAuth as { code?: string } | undefined)?.code;
      if (codigo === 'auth/requires-recent-login') {
        setProvedor(authService.obterProvedorPrincipal());
        setPrecisaReautenticar(true);
        setCarregando(false);
        return;
      }
      setCarregando(false);
      showToast(MENSAGEM_FALHA_ENCERRAR_ACESSO);
      return;
    }
    // Sucesso: `carregando` fica true até o listener desmontar a árvore.
  }, [apagarContaAuth, showToast]);

  const reautenticar = useCallback(
    async (senha?: string) => {
      setCarregando(true);
      setErro(null);

      try {
        if (provedor === 'google.com') {
          await authService.reautenticarComGoogle();
        } else {
          if (!senha) {
            setCarregando(false);
            setErro(MENSAGEM_SENHA_INCORRETA);
            return;
          }
          await authService.reautenticarComSenha(senha);
        }
      } catch (erroReauth) {
        const codigo = (erroReauth as { code?: string } | undefined)?.code;
        setCarregando(false);
        if (codigo === 'auth/reauth-cancelada') {
          // usuário abandonou o fluxo do Google — segue aguardando, sem erro
          return;
        }
        setErro(
          codigo === 'auth/wrong-password' ||
            codigo === 'auth/invalid-credential'
            ? MENSAGEM_SENHA_INCORRETA
            : MENSAGEM_FALHA_REAUTENTICACAO,
        );
        return;
      }

      setPrecisaReautenticar(false);

      // Retoma o passo 5.
      try {
        await apagarContaAuth();
      } catch {
        setCarregando(false);
        showToast(MENSAGEM_FALHA_ENCERRAR_ACESSO);
      }
    },
    [apagarContaAuth, provedor, showToast],
  );

  const cancelarReautenticacao = useCallback(() => {
    setPrecisaReautenticar(false);
    setProvedor(null);
    setErro(null);
    setCarregando(false);
  }, []);

  return {
    excluirConta,
    precisaReautenticar,
    provedor,
    reautenticar,
    cancelarReautenticacao,
    carregando,
    erro,
  };
}
