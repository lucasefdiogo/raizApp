import React, { useEffect } from 'react';
import { usePausaNoturna } from '../../hooks/usePausaNoturna';
import { useAnalytics } from '../../hooks/useAnalytics';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { EsperaAcessoRapidoScreen } from '../intercept/EsperaAcessoRapidoScreen';
import { Tarefa } from '../../domain/types';
import {
  calcularTipoAlternativa,
  escolherTarefaAlternativa,
  truncarTitulo,
} from '../../domain/alternativaDia';

interface EsperaAcessoRapidoNoturnaProps {
  uid: string;
  appIconeBase64: string;
  appLabel: string;
  blocosUsados: number;
  /** 5s fora da janela noturna, 30s dentro dela (useBloqueioSaldo já decide). */
  esperaSeg: number;
  /** Tarefas de hoje (ver InterceptScreen.tarefasParaExibir) — fonte da alternativa do dia. */
  tarefas: Tarefa[];
  onLiberado: () => void;
  onVoltarAoInicio: () => void;
  /** Alternativa noturna: fecha a interceptação sem liberar (RN08). */
  onAlternativa: () => void;
  /** Alternativa do dia: abre a sessão de foco com essa tarefa, sem gastar a cota. */
  onAlternativaDia: (tarefaId: string) => void;
}

/**
 * Espera do acesso rápido com a janela noturna (HU-11, RN07/RN08/RN09) —
 * mesmo padrão de PausaIntencaoNoturna: só monta na fase de acesso rápido,
 * pra rotação de frases avançar só quando a tela de fato aparece. Fora da
 * janela, decide a alternativa do dia; dentro dela, só a alternativa noturna
 * já cadastrada vale, mesmo com tarefa pendente.
 */
export function EsperaAcessoRapidoNoturna({
  uid,
  appIconeBase64,
  appLabel,
  blocosUsados,
  esperaSeg,
  tarefas,
  onLiberado,
  onVoltarAoInicio,
  onAlternativa,
  onAlternativaDia,
}: EsperaAcessoRapidoNoturnaProps) {
  const noturna = usePausaNoturna(uid, blocosUsados);
  const { logInterceptShown } = useAnalytics();

  const posicaoSessao = blocosUsados + 1;
  const tarefaAlternativa = noturna.noturna
    ? null
    : escolherTarefaAlternativa(tarefas, posicaoSessao);
  const tipoAlternativa = calcularTipoAlternativa(
    noturna.noturna,
    noturna.alternativa,
    tarefaAlternativa,
  );

  useEffect(() => {
    if (noturna.carregando) {
      return;
    }
    logInterceptShown('B', noturna.noturna, tipoAlternativa);
    // Dispara uma única vez quando a rotina resolve — ver PausaIntencaoNoturna.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noturna.carregando]);

  if (noturna.carregando) {
    return <LoadingIndicator variant="fullscreen" />;
  }

  const alternativa = noturna.noturna
    ? noturna.alternativa ?? undefined
    : tarefaAlternativa
    ? truncarTitulo(tarefaAlternativa.titulo)
    : undefined;
  const handleAlternativa = noturna.noturna
    ? onAlternativa
    : tarefaAlternativa
    ? () => onAlternativaDia(tarefaAlternativa.id)
    : undefined;

  return (
    <EsperaAcessoRapidoScreen
      appIconeBase64={appIconeBase64}
      appLabel={appLabel}
      esperaSeg={esperaSeg}
      onLiberado={onLiberado}
      onVoltarAoInicio={onVoltarAoInicio}
      mensagemNoturna={noturna.noturna ? noturna.mensagem ?? undefined : undefined}
      alternativa={alternativa}
      onAlternativa={handleAlternativa}
    />
  );
}
