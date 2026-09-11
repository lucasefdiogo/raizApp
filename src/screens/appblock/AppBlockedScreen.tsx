import React, { useEffect, useState } from 'react';
import { BackHandler, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useDailyTasks } from '../../hooks/useDailyTasks';
import { existeEssencialConcluida } from '../../domain/streak';
import { AppBloqueadoInfo } from '../../hooks/useAppBlocking';
import { RootProgressIcon } from '../../components/RootProgressIcon';
import { PrimaryButton } from '../../components/PrimaryButton';

const MINUTOS_DESBLOQUEIO = 15;
const DURACAO_RESPIRACAO_SEGUNDOS = 60;

type Modo = 'escolha' | 'tarefas_pendentes' | 'respiracao' | 'liberado';

interface AppBlockedScreenProps {
  uid: string;
  appBloqueado: AppBloqueadoInfo;
  onDesbloquear: (minutos: number) => void;
  onFechar: () => void;
}

/**
 * Tela cheia que "cobre" o app bloqueado — a MainActivity é trazida pra
 * frente pelo AccessibilityService (ver RootoraAccessibilityService.kt), e
 * o RootNavigator monta esta tela por cima de qualquer outra rota enquanto
 * useAppBlocking.appBloqueadoAtual não é null. Não é uma rota do
 * react-navigation (não tem foco de navegação pra usar
 * useBlockHardwareBack), então o botão físico voltar é bloqueado direto
 * aqui — do contrário ele fecharia a Activity e devolveria pro app
 * bloqueado sem passar por nenhum dos dois caminhos de desbloqueio.
 */
export function AppBlockedScreen({
  uid,
  appBloqueado,
  onDesbloquear,
  onFechar,
}: AppBlockedScreenProps) {
  const { tarefas, carregando: tarefasCarregando } = useDailyTasks(uid);
  const [modo, setModo] = useState<Modo>('escolha');
  const [segundosRestantes, setSegundosRestantes] = useState(
    DURACAO_RESPIRACAO_SEGUNDOS,
  );

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (modo !== 'respiracao') {
      return;
    }
    if (segundosRestantes <= 0) {
      onDesbloquear(MINUTOS_DESBLOQUEIO);
      setModo('liberado');
      return;
    }
    const temporizador = setTimeout(
      () => setSegundosRestantes(atual => atual - 1),
      1000,
    );
    return () => clearTimeout(temporizador);
  }, [modo, segundosRestantes, onDesbloquear]);

  function handleCumprirTarefas() {
    if (tarefasCarregando) {
      return;
    }
    if (existeEssencialConcluida(tarefas)) {
      onDesbloquear(MINUTOS_DESBLOQUEIO);
      setModo('liberado');
    } else {
      setModo('tarefas_pendentes');
    }
  }

  function handleIniciarRespiracao() {
    setSegundosRestantes(DURACAO_RESPIRACAO_SEGUNDOS);
    setModo('respiracao');
  }

  return (
    <SafeAreaView style={styles.container} testID="app-blocked-screen">
      <View style={styles.conteudo}>
        <View style={styles.identificacaoApp}>
          {appBloqueado.icone && (
            <Image
              source={{ uri: appBloqueado.icone }}
              style={styles.icone}
              accessibilityLabel={appBloqueado.nome}
            />
          )}
          <Text style={styles.nomeApp}>{appBloqueado.nome}</Text>
        </View>

        <Text style={styles.titulo}>Hora de pausar</Text>

        {modo === 'escolha' && (
          <View style={styles.opcoes}>
            <Pressable
              testID="opcao-tarefas-essenciais"
              accessibilityRole="button"
              onPress={handleCumprirTarefas}
              style={[styles.opcao, tarefasCarregando && styles.opcaoCarregando]}
            >
              <Text style={styles.opcaoTitulo}>
                Cumprir minhas tarefas essenciais
              </Text>
              <Text style={styles.opcaoCorpo}>
                {tarefasCarregando
                  ? 'Verificando suas tarefas de hoje…'
                  : 'Se já cumpriu hoje, libera na hora.'}
              </Text>
            </Pressable>

            <Pressable
              testID="opcao-pausa-respiracao"
              accessibilityRole="button"
              onPress={handleIniciarRespiracao}
              style={styles.opcao}
            >
              <Text style={styles.opcaoTitulo}>Pausa de respiração (60s)</Text>
              <Text style={styles.opcaoCorpo}>Um minuto antes de voltar.</Text>
            </Pressable>

            <Pressable
              testID="opcao-agora-nao"
              accessibilityRole="button"
              onPress={onFechar}
              hitSlop={8}
              style={styles.agoraNao}
            >
              <Text style={styles.agoraNaoTexto}>Agora não</Text>
            </Pressable>
          </View>
        )}

        {modo === 'tarefas_pendentes' && (
          <View style={styles.aviso}>
            <Text style={styles.avisoTexto}>
              Ainda faltam suas tarefas essenciais de hoje.
            </Text>
            <PrimaryButton titulo="Ir para o Rootora" onPress={onFechar} />
          </View>
        )}

        {modo === 'respiracao' && (
          <View style={styles.respiracao} testID="pausa-respiracao">
            <RootProgressIcon variant="escudo" tamanho={96} />
            <Text style={styles.contagem}>{segundosRestantes}s</Text>
          </View>
        )}

        {modo === 'liberado' && (
          <View style={styles.liberado}>
            <Text style={styles.liberadoTexto}>
              Liberado por {MINUTOS_DESBLOQUEIO} minutos
            </Text>
            <PrimaryButton titulo="Fechar" onPress={onFechar} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  conteudo: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identificacaoApp: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  icone: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.sm,
  },
  nomeApp: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  titulo: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  opcoes: {
    width: '100%',
    gap: theme.spacing.md,
  },
  opcao: {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.xs,
  },
  opcaoTitulo: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
  },
  opcaoCorpo: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  opcaoCarregando: {
    opacity: 0.5,
  },
  agoraNao: {
    alignSelf: 'center',
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  agoraNaoTexto: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  aviso: {
    width: '100%',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  avisoTexto: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  respiracao: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  contagem: {
    fontSize: theme.typography.fontSize.xxl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  liberado: {
    width: '100%',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  liberadoTexto: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.musgo,
  },
});
