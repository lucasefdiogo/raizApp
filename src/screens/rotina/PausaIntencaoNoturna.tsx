import React from 'react';
import { usePausaNoturna } from '../../hooks/usePausaNoturna';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { PausaIntencaoScreen } from '../intercept/PausaIntencaoScreen';

interface PausaIntencaoNoturnaProps {
  uid: string;
  appLabel: string;
  blocosUsados: number;
  /** Duração da HU-04 (saldo.pausaIntencaoSeg), usada fora da janela noturna. */
  duracaoPadraoSeg: number;
  saldo: number | null;
  onLiberar: (intencao: string) => void;
  onAgoraNao: () => void;
  /** Atalho da alternativa noturna: fecha a interceptação sem liberar a sessão. */
  onAlternativaNoturna: () => void;
}

/**
 * Pausa de intenção da interceptação com a janela noturna da HU-06. Só monta
 * na fase de pausa, para que a rotação de mensagens avance apenas quando uma
 * pausa de fato aparece. A pausa só monta depois que o hook responde, porque
 * a contagem parte da duração do primeiro render.
 */
export function PausaIntencaoNoturna({
  uid,
  appLabel,
  blocosUsados,
  duracaoPadraoSeg,
  saldo,
  onLiberar,
  onAgoraNao,
  onAlternativaNoturna,
}: PausaIntencaoNoturnaProps) {
  const noturna = usePausaNoturna(uid, blocosUsados);

  if (noturna.carregando) {
    return <LoadingIndicator variant="fullscreen" />;
  }

  return (
    <PausaIntencaoScreen
      appLabel={appLabel}
      duracaoSeg={noturna.noturna ? noturna.duracaoSeg : duracaoPadraoSeg}
      saldo={saldo}
      onLiberar={onLiberar}
      onAgoraNao={onAgoraNao}
      mensagemNoturna={noturna.mensagem ?? undefined}
      alternativa={noturna.alternativa ?? undefined}
      onAlternativa={onAlternativaNoturna}
    />
  );
}
