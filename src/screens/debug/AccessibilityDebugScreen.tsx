import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import {
  isAccessibilityServiceEnabled,
  openAccessibilitySettings,
  subscribeToForegroundApp,
} from '../../native/AccessibilityDetection';

interface DeteccaoRegistro {
  packageName: string;
  em: number;
}

const MAX_REGISTROS = 50;

/**
 * Tela SÓ de validação manual do pipeline de detecção (Fase 3, parte 1).
 * Não é UI final do produto — vai ser removida/escondida numa tarefa futura.
 * Acessível via botão dev na PerfilScreen.
 */
export function AccessibilityDebugScreen() {
  const [servicoAtivo, setServicoAtivo] = useState<boolean | null>(null);
  const [deteccoes, setDeteccoes] = useState<DeteccaoRegistro[]>([]);

  const verificarStatus = useCallback(async () => {
    setServicoAtivo(await isAccessibilityServiceEnabled());
  }, []);

  useEffect(() => {
    verificarStatus();
  }, [verificarStatus]);

  useEffect(() => {
    const cancelar = subscribeToForegroundApp(packageName => {
      setDeteccoes(atual =>
        [{ packageName, em: Date.now() }, ...atual].slice(0, MAX_REGISTROS),
      );
    });
    return cancelar;
  }, []);

  const rotuloStatus =
    servicoAtivo === null
      ? 'Verificando…'
      : servicoAtivo
        ? 'Serviço ativo'
        : 'Serviço desativado';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titulo}>Debug — detecção de apps</Text>

      <Text
        testID="status-servico"
        style={[
          styles.status,
          servicoAtivo === true && styles.statusAtivo,
          servicoAtivo === false && styles.statusInativo,
        ]}
      >
        {rotuloStatus}
      </Text>

      <PrimaryButton
        titulo="Ativar nas configurações"
        onPress={openAccessibilitySettings}
      />
      <Pressable
        accessibilityRole="button"
        onPress={verificarStatus}
        hitSlop={8}
      >
        <Text style={styles.link}>Verificar de novo</Text>
      </Pressable>

      <Text style={styles.secao}>Últimos pacotes detectados</Text>
      <FlatList
        style={styles.lista}
        data={deteccoes}
        keyExtractor={(item, indice) => `${item.em}-${indice}`}
        renderItem={({ item }) => (
          <Text style={styles.pacote}>{item.packageName}</Text>
        )}
        ListEmptyComponent={
          <Text style={styles.vazio}>
            Nada detectado ainda. Com o serviço ativo, troque de app no
            celular.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  titulo: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  status: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textSecondary,
  },
  statusAtivo: {
    color: theme.colors.musgo,
  },
  statusInativo: {
    color: theme.colors.erro,
  },
  link: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.cobre,
  },
  secao: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  lista: {
    flex: 1,
  },
  pacote: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  vazio: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
});
