import React from 'react';
import { usePausaNoturna } from '../../hooks/usePausaNoturna';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { EsperaAcessoRapidoScreen } from '../intercept/EsperaAcessoRapidoScreen';

interface EsperaAcessoRapidoNoturnaProps {
  uid: string;
  appIconeBase64: string;
  appLabel: string;
  blocosUsados: number;
  /** 5s fora da janela noturna, 30s dentro dela (useBloqueioSaldo já decide). */
  esperaSeg: number;
  onLiberado: () => void;
  onVoltarAoInicio: () => void;
  /** Alternativa noturna: fecha a interceptação sem liberar (RN08). */
  onAlternativa: () => void;
}

/**
 * Espera do acesso rápido com a janela noturna (HU-11, RN07/RN08/RN09) —
 * mesmo padrão de PausaIntencaoNoturna: só monta na fase de acesso rápido,
 * pra rotação de frases avançar só quando a tela de fato aparece.
 */
export function EsperaAcessoRapidoNoturna({
  uid,
  appIconeBase64,
  appLabel,
  blocosUsados,
  esperaSeg,
  onLiberado,
  onVoltarAoInicio,
  onAlternativa,
}: EsperaAcessoRapidoNoturnaProps) {
  const noturna = usePausaNoturna(uid, blocosUsados);

  if (noturna.carregando) {
    return <LoadingIndicator variant="fullscreen" />;
  }

  return (
    <EsperaAcessoRapidoScreen
      appIconeBase64={appIconeBase64}
      appLabel={appLabel}
      esperaSeg={esperaSeg}
      onLiberado={onLiberado}
      onVoltarAoInicio={onVoltarAoInicio}
      mensagemNoturna={noturna.noturna ? noturna.mensagem ?? undefined : undefined}
      alternativa={noturna.noturna ? noturna.alternativa ?? undefined : undefined}
      onAlternativa={onAlternativa}
    />
  );
}
