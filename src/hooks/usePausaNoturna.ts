import { useEffect, useState } from 'react';
import { buscarUsuario } from '../services/firestore';
import { registrarErro } from '../services/crashlytics';
import { lerItem, salvarItem } from '../utils/storage';
import { dentroDaJanelaNoturna } from '../domain/rotina';
import {
  duracaoPausaIntencaoNoturnaSeg,
  duracaoPausaIntencaoSeg,
} from '../domain/saldoBloqueio';
import { proximaMensagemNoturna } from '../domain/mensagensNoturnas';

const CHAVE_INDICE_MENSAGEM = 'rootora.mensagemNoturna.indice';

export interface PausaNoturna {
  carregando: boolean;
  noturna: boolean;
  duracaoSeg: number;
  mensagem: string | null;
  alternativa: string | null;
}

/**
 * Night-time intent pause (HU-06, RN-05, RN-08 a RN-11). Reads the routine
 * once on mount; inside the night window returns the doubled duration, the next
 * rotating message and the user's alternative. Any failure falls back to the
 * default pause, which is never blocked.
 */
export function usePausaNoturna(
  uid: string,
  blocosUsados: number,
): PausaNoturna {
  const [estado, setEstado] = useState<{
    carregando: boolean;
    noturna: boolean;
    mensagem: string | null;
    alternativa: string | null;
  }>({ carregando: true, noturna: false, mensagem: null, alternativa: null });

  useEffect(() => {
    let ativo = true;
    (async () => {
      let resultado = {
        carregando: false,
        noturna: false,
        mensagem: null as string | null,
        alternativa: null as string | null,
      };
      try {
        const usuario = await buscarUsuario(uid);
        const rotina = usuario?.rotina;
        if (rotina && dentroDaJanelaNoturna(rotina, new Date())) {
          const anterior = await lerItem<number>(CHAVE_INDICE_MENSAGEM);
          const { indice, texto } = proximaMensagemNoturna(anterior);
          await salvarItem(CHAVE_INDICE_MENSAGEM, indice);
          resultado = {
            carregando: false,
            noturna: true,
            mensagem: texto,
            alternativa: rotina.alternativaNoturna?.trim() || null,
          };
        }
      } catch (erro) {
        registrarErro(
          erro instanceof Error ? erro : new Error(String(erro)),
          'usePausaNoturna',
        );
      }
      if (ativo) {
        setEstado(resultado);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [uid]);

  return {
    ...estado,
    duracaoSeg: estado.noturna
      ? duracaoPausaIntencaoNoturnaSeg(blocosUsados)
      : duracaoPausaIntencaoSeg(blocosUsados),
  };
}
