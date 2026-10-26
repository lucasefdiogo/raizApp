import React, { useEffect } from 'react';
import { usePausaNoturna } from '../../hooks/usePausaNoturna';
import { useAnalytics } from '../../hooks/useAnalytics';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { PausaIntencaoScreen } from '../intercept/PausaIntencaoScreen';
import { Tarefa } from '../../domain/types';
import {
  calcularTipoAlternativa,
  escolherTarefaAlternativa,
  truncarTitulo,
} from '../../domain/alternativaDia';

interface PausaIntencaoNoturnaProps {
  uid: string;
  appIconeBase64: string;
  appLabel: string;
  blocosUsados: number;
  /** Para o botão ao zerar: "Liberar {duracaoBlocoMin} min" (RN04). */
  duracaoBlocoMin: number;
  /** Duração da HU-04 (saldo.pausaIntencaoSeg), usada fora da janela noturna. */
  duracaoPadraoSeg: number;
  saldo: number | null;
  /** Tarefas de hoje (ver InterceptScreen.tarefasParaExibir) — fonte da alternativa do dia. */
  tarefas: Tarefa[];
  onLiberar: (intencao: string) => void;
  onAgoraNao: () => void;
  /** Atalho da alternativa noturna: fecha a interceptação sem liberar a sessão. */
  onAlternativaNoturna: () => void;
  /** Alternativa do dia: abre a sessão de foco com essa tarefa, sem liberar a sessão. */
  onAlternativaDia: (tarefaId: string) => void;
}

/**
 * Pausa de intenção da interceptação com a janela noturna da HU-06. Só monta
 * na fase de pausa, para que a rotação de mensagens avance apenas quando uma
 * pausa de fato aparece. A pausa só monta depois que o hook responde, porque
 * a contagem parte da duração do primeiro render. Fora da janela, decide a
 * alternativa do dia (tarefa pendente); dentro da janela, só a alternativa
 * noturna já cadastrada vale, mesmo com tarefa pendente.
 */
export function PausaIntencaoNoturna({
  uid,
  appIconeBase64,
  appLabel,
  blocosUsados,
  duracaoBlocoMin,
  duracaoPadraoSeg,
  saldo,
  tarefas,
  onLiberar,
  onAgoraNao,
  onAlternativaNoturna,
  onAlternativaDia,
}: PausaIntencaoNoturnaProps) {
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
    // Dispara uma única vez quando a rotina resolve — tipoAlternativa/noturna.noturna
    // vêm do mesmo resultado e não precisam disparar o efeito de novo.
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
  const onAlternativa = noturna.noturna
    ? onAlternativaNoturna
    : tarefaAlternativa
    ? () => onAlternativaDia(tarefaAlternativa.id)
    : undefined;

  return (
    <PausaIntencaoScreen
      appIconeBase64={appIconeBase64}
      appLabel={appLabel}
      duracaoSeg={noturna.noturna ? noturna.duracaoSeg : duracaoPadraoSeg}
      duracaoBlocoMin={duracaoBlocoMin}
      posicaoSessao={posicaoSessao}
      saldo={saldo}
      onLiberar={onLiberar}
      onAgoraNao={onAgoraNao}
      mensagemNoturna={noturna.mensagem ?? undefined}
      alternativa={alternativa}
      onAlternativa={onAlternativa}
    />
  );
}
