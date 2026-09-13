import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';

interface NotificationPrimingScreenProps {
  onPermitir: () => void;
  onRecusar: () => void;
}

interface ItemLista {
  texto: string;
  incluido: boolean;
}

const ITENS: ItemLista[] = [
  {
    texto: 'Um lembrete, 1x ao dia, no horário que você escolher',
    incluido: true,
  },
  {
    texto:
      'Um aviso perto do fim do dia, só se sua tarefa essencial ainda não foi feita',
    incluido: true,
  },
  { texto: 'Sem notificação de marketing ou novidade', incluido: false },
];

/**
 * Explica o que o Rootora manda antes do pedido nativo de permissão de
 * notificação — par da tela de priming do Accessibility Service (ver
 * AppBlockConfigScreen). Componente burro: uid, hookup com
 * useLocalNotifications e a decisão de quando exibir vivem no ponto de
 * entrada do boot (RootNavigator), não aqui.
 */
export function NotificationPrimingScreen({
  onPermitir,
  onRecusar,
}: NotificationPrimingScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.conteudo}>
        <Text style={styles.titulo}>
          Só 2 tipos de aviso, nada além disso
        </Text>
        <Text style={styles.introducao}>
          Se você permitir, o Rootora manda no máximo:
        </Text>

        <View style={styles.lista}>
          {ITENS.map(item => (
            <View key={item.texto} style={styles.linha}>
              <Text
                style={[
                  styles.marcador,
                  item.incluido ? styles.marcadorIncluido : styles.marcadorExcluido,
                ]}
              >
                {item.incluido ? '✓' : '✕'}
              </Text>
              <Text style={styles.itemTexto}>{item.texto}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.rodape}>
        <PrimaryButton titulo="Permitir notificações" onPress={onPermitir} />
        <SecondaryButton titulo="Agora não" onPress={onRecusar} />
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
    justifyContent: 'center',
    gap: theme.spacing.lg,
  },
  titulo: {
    fontSize: theme.typography.fontSize.xxl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
  },
  introducao: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  lista: {
    gap: theme.spacing.md,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  marcador: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  marcadorIncluido: {
    color: theme.colors.musgo,
  },
  marcadorExcluido: {
    color: theme.colors.terraSuave,
  },
  itemTexto: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  rodape: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
});
