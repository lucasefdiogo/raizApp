import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { EstadoTravado, OrigemSessaoFoco } from '../../domain/types';
import { useFocusSession } from '../../hooks/useFocusSession';
import { RootProgressIcon } from '../../components/RootProgressIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';
import { TaskCompletedOverlay } from '../../components/home/TaskCompletedOverlay';

const MENSAGEM_FEITO = 'Feito. Isso conta.';

interface SessaoFocoScreenProps {
  uid: string;
  duracaoInicialSeg: number;
  tarefaId: string | null;
  origem: OrigemSessaoFoco;
  estadoTravado: EstadoTravado | null;
  /** Guard de "já concluída" fica com quem chama (ver TravadoFlowScreen). */
  onMarcarTarefaComoFeita: () => void;
  /** Fecha o fluxo inteiro e volta pra Home/pro app de origem. */
  onFechar: () => void;
  /**
   * Nome exibido do app de origem — só usado no texto do botão "Liberar".
   * Ausente quando origem !== 'interceptacao' (a única situação em que o
   * botão aparece, ver seção 5 da spec).
   */
  appLabel?: string;
  /**
   * Package name do app de origem — repassado pro useFocusSession pra
   * espelhar "sessão ativa" em SharedPreferences (Etapa 4). Ausente quando
   * origem !== 'interceptacao'.
   */
  packageName?: string;
  /**
   * Desbloqueio nativo de fato (registrarDesbloqueioTemporario + abrirApp)
   * — quem chama decide, essa tela só registra a sessão como
   * 'liberou_app' e aciona isso. Ausente = botão não aparece, mesmo com
   * origem === 'interceptacao'.
   */
  onLiberarApp?: () => void;
}

function formatarMMSS(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return `${minutos}:${String(resto).padStart(2, '0')}`;
}

/**
 * Timer + FimSessao (seção 5 da spec 09-ponte-fuga-tarefa). Textos exatos:
 * durante a contagem, "Só [N] minutos. Pode parar depois."; ao terminar,
 * "[N] minutos feitos. O começo era a parte difícil." — N sempre em
 * minutos, arredondado (as durações usadas aqui são sempre múltiplos de
 * minuto inteiro). Reaparecer com o timer em andamento ao sair pra um app
 * bloqueado (Etapa 3/4, depende do SharedPreferences do nativo) não existe
 * ainda — aqui o timer só vive enquanto este componente está montado.
 */
export function SessaoFocoScreen({
  uid,
  duracaoInicialSeg,
  tarefaId,
  origem,
  estadoTravado,
  onMarcarTarefaComoFeita,
  onFechar,
  appLabel,
  packageName,
  onLiberarApp,
}: SessaoFocoScreenProps) {
  const {
    fase,
    duracaoPlanejadaSeg,
    segundosRestantes,
    podeMarcarComoFeita,
    continuarMais10Minutos,
    marcarTarefaComoFeita,
    pararAqui,
    liberarApp,
  } = useFocusSession({
    uid,
    duracaoInicialSeg,
    packageName,
    tarefaId,
    origem,
    estadoTravado,
    onTarefaConcluida: onMarcarTarefaComoFeita,
  });
  const [overlayFeitoVisivel, setOverlayFeitoVisivel] = useState(false);

  const minutos = Math.round(duracaoPlanejadaSeg / 60);

  function handleMarcarComoFeita() {
    marcarTarefaComoFeita();
    setOverlayFeitoVisivel(true);
  }

  function handlePararAqui() {
    pararAqui();
    onFechar();
  }

  const mostrarLiberar =
    origem === 'interceptacao' && onLiberarApp !== undefined;

  function handleLiberarApp() {
    liberarApp();
    onLiberarApp?.();
  }

  return (
    <View style={styles.container} testID="sessao-foco-screen">
      {fase === 'contando' && (
        <View style={styles.contando}>
          <RootProgressIcon variant="escudo" tamanho={96} />
          <Text style={styles.contagem}>{formatarMMSS(segundosRestantes)}</Text>
          <Text style={styles.textoContando}>
            Só {minutos} minutos. Pode parar depois.
          </Text>
        </View>
      )}

      {fase === 'concluida' && (
        <View style={styles.concluida}>
          <Text style={styles.textoConcluida}>
            {minutos} minutos feitos. O começo era a parte difícil.
          </Text>
          <View style={styles.acoes}>
            <PrimaryButton
              titulo="Continuar mais 10 minutos"
              onPress={continuarMais10Minutos}
            />
            {podeMarcarComoFeita && (
              <SecondaryButton
                titulo="Marcar a tarefa como feita"
                onPress={handleMarcarComoFeita}
              />
            )}
            <SecondaryButton titulo="Parar aqui" onPress={handlePararAqui} />
            {mostrarLiberar && (
              <SecondaryButton
                titulo={`Liberar o ${appLabel} por 15 minutos`}
                onPress={handleLiberarApp}
              />
            )}
          </View>
        </View>
      )}

      <TaskCompletedOverlay
        visible={overlayFeitoVisivel}
        mensagem={MENSAGEM_FEITO}
        onHide={() => {
          setOverlayFeitoVisivel(false);
          onFechar();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  contando: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  contagem: {
    fontSize: theme.typography.fontSize.xxl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  textoContando: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  concluida: {
    width: '100%',
    gap: theme.spacing.lg,
    alignItems: 'center',
  },
  textoConcluida: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  acoes: {
    width: '100%',
    gap: theme.spacing.md,
  },
});
