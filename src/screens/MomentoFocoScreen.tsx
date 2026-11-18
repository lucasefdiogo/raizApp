import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { Tarefa } from '../domain/types';
import { theme } from '../theme';
import { SessaoFocoScreen } from './intercept/SessaoFocoScreen';

interface MomentoFocoScreenProps {
  uid: string;
  tarefa: Tarefa;
  onEstouTravado: () => void;
  onMarcarTarefaComoFeita: () => void;
  onFechar: () => void;
}

const DURACOES = [2, 5, 10] as const;

export function MomentoFocoScreen({
  uid,
  tarefa,
  onEstouTravado,
  onMarcarTarefaComoFeita,
  onFechar,
}: MomentoFocoScreenProps) {
  const [duracaoMinutos, setDuracaoMinutos] = useState<number>(5);
  const [iniciado, setIniciado] = useState(false);
  const [pararAoVoltar, setPararAoVoltar] = useState(false);

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => iniciado ? setPararAoVoltar(true) : onFechar()}
      testID="momento-foco-modal"
    >
      <SafeAreaView style={styles.container}>
        {iniciado ? (
          <SessaoFocoScreen
            uid={uid}
            duracaoInicialSeg={duracaoMinutos * 60}
            tarefaId={tarefa.id}
            origem="home"
            estadoTravado={null}
            bloquearAppsSelecionados
            pararAoVoltar={pararAoVoltar}
            onMarcarTarefaComoFeita={onMarcarTarefaComoFeita}
            onFechar={onFechar}
          />
        ) : (
          <View style={styles.conteudo}>
            <Text style={styles.titulo}>Momento de foco</Text>
            <Text style={styles.tarefa}>{tarefa.titulo}</Text>
            <Text style={styles.descricao}>Por quanto tempo quer começar?</Text>
            <View style={styles.duracoes}>
              {DURACOES.map(minutos => (
                <Pressable
                  key={minutos}
                  accessibilityRole="button"
                  accessibilityState={{ selected: duracaoMinutos === minutos }}
                  onPress={() => setDuracaoMinutos(minutos)}
                  style={[styles.duracao, duracaoMinutos === minutos && styles.duracaoSelecionada]}
                >
                  <Text style={styles.duracaoTexto}>{minutos} min</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.ajuda}>
              Durante a contagem, os apps escolhidos em Bloqueio de apps ficam pausados se o bloqueio estiver ativo. Você pode parar quando quiser.
            </Text>
            <PrimaryButton titulo="Iniciar momento de foco" onPress={() => setIniciado(true)} />
            <SecondaryButton titulo="Estou travado" onPress={onEstouTravado} />
            <SecondaryButton titulo="Voltar" onPress={onFechar} />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  conteudo: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  titulo: {
    fontFamily: theme.typography.fontFamily.headingBold,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textPrimary,
  },
  tarefa: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
  },
  descricao: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
  },
  duracoes: { flexDirection: 'row', gap: theme.spacing.sm },
  duracao: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
  },
  duracaoSelecionada: { borderColor: theme.colors.musgo, backgroundColor: theme.colors.surface },
  duracaoTexto: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
  },
  ajuda: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});
