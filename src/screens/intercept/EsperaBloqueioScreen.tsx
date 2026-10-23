import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { TipoValvula, Valvula } from '../../domain/valvulas';
import { InterceptLayout } from '../../components/intercept/InterceptLayout';
import { ContagemEspera } from '../../components/intercept/ContagemEspera';

interface EsperaBloqueioScreenProps {
  appIconeBase64: string;
  appLabel: string;
  /** cooldown = contagem regressiva até a próxima sessão; zerado = sessões do dia usadas (só com limite diário). */
  variante: 'cooldown' | 'zerado';
  /** Só usado em 'cooldown'. */
  restanteMs?: number;
  /** Duração total do cooldown — base da barra de "tempo já passado" (RN10). Só em 'cooldown'. */
  cooldownTotalMs?: number;
  duracaoBlocoMin: number;
  valvulas: Valvula[];
  onValvula: (tipo: TipoValvula) => void;
  onVoltarAoInicio: () => void;
}

function formatarContagem(ms: number): { texto: string; label: string } {
  if (ms < 60_000) {
    const segundos = Math.ceil(ms / 1000);
    return { texto: `${segundos} s`, label: `Próximo acesso em ${segundos} segundos` };
  }
  const minutos = Math.ceil(ms / 60_000);
  return {
    texto: `${minutos} min`,
    label: `Próximo acesso em ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`,
  };
}

/**
 * Cooldown entre sessões e saldo zerado (HU-04/HU-11, RN10/RN14): as saídas
 * úteis ficam em "OUTRAS SAÍDAS" (RN02/RN11, resolvidas por
 * domain/valvulas.ts e passadas pelo InterceptScreen). Texto neutro, sem
 * cobrança.
 */
export function EsperaBloqueioScreen({
  appIconeBase64,
  appLabel,
  variante,
  restanteMs = 0,
  cooldownTotalMs = 0,
  duracaoBlocoMin,
  valvulas,
  onValvula,
  onVoltarAoInicio,
}: EsperaBloqueioScreenProps) {
  const contagem = formatarContagem(Math.max(0, restanteMs));
  const progresso =
    cooldownTotalMs > 0 ? Math.min(1, Math.max(0, (cooldownTotalMs - restanteMs) / cooldownTotalMs)) : 0;

  return (
    <InterceptLayout
      appIconeBase64={appIconeBase64}
      appNome={appLabel}
      eyebrow={variante === 'cooldown' ? 'PAUSA ENTRE SESSÕES' : 'SESSÕES DE HOJE ENCERRADAS'}
      headline={variante === 'zerado' ? 'Por hoje, as sessões acabaram.' : undefined}
      valvulas={valvulas}
      onValvula={onValvula}
      onVoltarAoInicio={onVoltarAoInicio}
    >
      {variante === 'cooldown' ? (
        <>
          <ContagemEspera texto={contagem.texto} accessibilityLabel={contagem.label} />
          <View style={styles.barraFundo}>
            <View style={[styles.barraPreenchida, { width: `${progresso * 100}%` }]} />
          </View>
          <Text style={styles.apoio}>
            Até a próxima sessão de {duracaoBlocoMin} min.
          </Text>
        </>
      ) : (
        <Text style={styles.apoio}>Amanhã elas voltam. Enquanto isso, dá pra:</Text>
      )}
    </InterceptLayout>
  );
}

const styles = StyleSheet.create({
  apoio: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  barraFundo: {
    alignSelf: 'stretch',
    height: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  barraPreenchida: {
    height: '100%',
    backgroundColor: theme.colors.musgo,
    borderRadius: theme.radius.full,
  },
});
