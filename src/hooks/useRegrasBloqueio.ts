import { useCallback, useEffect, useState } from 'react';
import { JanelaBloqueio, RegrasBloqueio, RegrasBloqueioPendentes } from '../domain/types';
import { decidirGravacaoRegrasBloqueio } from '../domain/appBlock';
import { hojeISOLocal } from '../domain/data';
import {
  buscarUsuario,
  cancelarRegrasBloqueioPendentes,
  salvarRegrasBloqueioImediatas,
  salvarRegrasBloqueioPendentes as salvarRegrasBloqueioPendentesFirestore,
} from '../services/firestore';
import {
  AppInstalado,
  listarAppsInstalados,
  salvarRegrasBloqueio as salvarRegrasBloqueioNativo,
  salvarRegrasBloqueioPendentes as salvarRegrasBloqueioPendentesNativo,
} from '../native/AccessibilityDetection';
import { registrarErro } from '../services/crashlytics';
import { useToast } from './useToast';

const MENSAGEM_FALHA_SALVAR = 'Não conseguimos salvar as regras agora. Tente de novo.';
const MENSAGEM_FALHA_CANCELAR = 'Não conseguimos cancelar a alteração agora. Tente de novo.';
const MENSAGEM_SALVO_IMEDIATO = 'Regras de bloqueio salvas.';
const MENSAGEM_SALVO_PENDENTE = 'Anotado. A nova regra começa amanhã.';

interface UseRegrasBloqueioResultado {
  carregando: boolean;
  appsInstalados: AppInstalado[];
  regrasVigentes: RegrasBloqueio | undefined;
  regrasPendentes: RegrasBloqueioPendentes | null;
  /** Resolve `true` se gravou, `false` se falhou (toast já foi disparado). */
  salvar: (apps: string[], janela: JanelaBloqueio | null) => Promise<boolean>;
  cancelarAlteracaoPendente: () => Promise<void>;
}

/**
 * Dados e ações da tela "Bloqueio de apps" (Perfil). A decisão de ONDE
 * gravar (direto em regrasBloqueio ou em regrasBloqueioPendentes) vem de
 * decidirGravacaoRegrasBloqueio — regra única, sem distinguir se a mudança
 * afrouxa ou endurece (ver domain/appBlock.ts). Mirror pro lado nativo
 * (SharedPreferences) acontece em toda gravação, pro AccessibilityService
 * enxergar a mudança sem depender do JS estar rodando.
 */
export function useRegrasBloqueio(uid: string): UseRegrasBloqueioResultado {
  const { showToast } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [appsInstalados, setAppsInstalados] = useState<AppInstalado[]>([]);
  const [regrasVigentes, setRegrasVigentes] = useState<RegrasBloqueio | undefined>(undefined);
  const [regrasPendentes, setRegrasPendentes] = useState<RegrasBloqueioPendentes | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      const [usuario, apps] = await Promise.all([buscarUsuario(uid), listarAppsInstalados()]);
      if (cancelado) {
        return;
      }
      setRegrasVigentes(usuario?.regrasBloqueio);
      setRegrasPendentes(usuario?.regrasBloqueioPendentes ?? null);
      // Ordem alfabética por nome (não a ordem que o PackageManager devolve,
      // que não segue critério nenhum visível pro usuário) — 'pt-BR' +
      // sensitivity 'base' pra acento/maiúscula não desempatarem antes da letra.
      setAppsInstalados(
        [...apps].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })),
      );
      setCarregando(false);
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [uid]);

  const salvar = useCallback(
    async (apps: string[], janela: JanelaBloqueio | null): Promise<boolean> => {
      const novasRegras: RegrasBloqueio = { apps, janelas: janela ? [janela] : [] };
      const decisao = decidirGravacaoRegrasBloqueio(regrasVigentes, novasRegras, hojeISOLocal());

      try {
        if (decisao.tipo === 'imediata') {
          await salvarRegrasBloqueioImediatas(uid, decisao.regras);
          salvarRegrasBloqueioNativo(decisao.regras);
          salvarRegrasBloqueioPendentesNativo(null);
          setRegrasVigentes(decisao.regras);
          showToast(MENSAGEM_SALVO_IMEDIATO);
        } else {
          await salvarRegrasBloqueioPendentesFirestore(uid, decisao.pendente);
          salvarRegrasBloqueioPendentesNativo(decisao.pendente);
          setRegrasPendentes(decisao.pendente);
          showToast(MENSAGEM_SALVO_PENDENTE);
        }
        return true;
      } catch (erro) {
        registrarErro(erro as Error, 'useRegrasBloqueio.salvar');
        showToast(MENSAGEM_FALHA_SALVAR);
        return false;
      }
    },
    [uid, regrasVigentes, showToast],
  );

  const cancelarAlteracaoPendente = useCallback(async () => {
    try {
      await cancelarRegrasBloqueioPendentes(uid);
      salvarRegrasBloqueioPendentesNativo(null);
      setRegrasPendentes(null);
    } catch (erro) {
      registrarErro(erro as Error, 'useRegrasBloqueio.cancelarAlteracaoPendente');
      showToast(MENSAGEM_FALHA_CANCELAR);
    }
  }, [uid, showToast]);

  return {
    carregando,
    appsInstalados,
    regrasVigentes,
    regrasPendentes,
    salvar,
    cancelarAlteracaoPendente,
  };
}
