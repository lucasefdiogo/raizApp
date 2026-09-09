import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { TutorialSlide } from '../../components/tutorial/TutorialSlide';
import { RootProgressIcon } from '../../components/RootProgressIcon';

interface TutorialScreenProps {
  onConcluir: () => void;
}

const TOTAL_PASSOS = 4;

const PASSOS_CICLO = [
  'Uma tarefa parece pesada',
  'O celular promete alívio',
  'O tempo passa, a culpa chega',
  'A tarefa parece ainda mais pesada',
];

const TAREFAS_EXEMPLO = [
  { titulo: 'Beber um copo de água', concluida: true },
  { titulo: 'Abrir o material por 2 min', concluida: false },
  { titulo: 'Separar a roupa de treino', concluida: false },
];

function CicloList() {
  return (
    <View style={styles.cicloLista}>
      {PASSOS_CICLO.map((passo, indice) => (
        <View key={passo} style={styles.cicloItemContainer}>
          <Text style={styles.cicloItem}>{passo}</Text>
          {indice < PASSOS_CICLO.length - 1 && (
            <Text style={styles.cicloSeta}>↓</Text>
          )}
        </View>
      ))}
    </View>
  );
}

function ExemploChecklist() {
  return (
    <View style={styles.checklist}>
      {TAREFAS_EXEMPLO.map(tarefa => (
        <View key={tarefa.titulo} style={styles.checklistLinha}>
          <View
            style={[
              styles.checklistCaixa,
              tarefa.concluida && styles.checklistCaixaMarcada,
            ]}
          />
          <Text
            style={[
              styles.checklistTexto,
              tarefa.concluida && styles.checklistTextoConcluido,
            ]}
          >
            {tarefa.titulo}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function TutorialScreen({ onConcluir }: TutorialScreenProps) {
  const [passo, setPasso] = useState(0);

  const avancar = () => setPasso(atual => Math.min(TOTAL_PASSOS - 1, atual + 1));

  return (
    <SafeAreaView style={styles.container}>
      {passo === 0 && (
        <TutorialSlide
          passoAtual={0}
          totalPassos={TOTAL_PASSOS}
          titulo="Isso te parece familiar?"
          corpo={<CicloList />}
          rodape="Isso não é falta de força de vontade. É um ciclo — e ciclos se quebram com o passo certo, não com mais cobrança."
          botaoPrimario={{ titulo: 'Continuar', onPress: avancar }}
          onPular={onConcluir}
        />
      )}
      {passo === 1 && (
        <TutorialSlide
          passoAtual={1}
          totalPassos={TOTAL_PASSOS}
          titulo={'Tarefas pequenas.\nSem cobrança.'}
          corpo={<ExemploChecklist />}
          rodape="Você escolhe até 3 tarefas essenciais por dia. Elas contam. O resto é bônus."
          botaoPrimario={{ titulo: 'Continuar', onPress: avancar }}
          onPular={onConcluir}
        />
      )}
      {passo === 2 && (
        <TutorialSlide
          passoAtual={2}
          totalPassos={TOTAL_PASSOS}
          eyebrow="Um dia sem fazer nada"
          titulo={'Um ramo fica mais fino.\nA raiz continua firme.'}
          corpo={<RootProgressIcon ramoEnfraquecido tamanho={112} />}
          rodape="Você tem 1 dia de proteção por semana. Depois disso, o progresso cai, mas nunca some."
          botaoPrimario={{ titulo: 'Continuar', onPress: avancar }}
          onPular={onConcluir}
        />
      )}
      {passo === 3 && (
        <TutorialSlide
          passoAtual={3}
          totalPassos={TOTAL_PASSOS}
          titulo="Vamos começar pequeno."
          rodape="Antes de tudo, queremos entender o que mais pesa pra você hoje. Leva menos de 2 minutos."
          botaoPrimario={{ titulo: 'Começar', onPress: onConcluir }}
          botaoSecundario={{ titulo: 'Já tenho conta', onPress: onConcluir }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  cicloLista: {
    alignItems: 'center',
  },
  cicloItemContainer: {
    alignItems: 'center',
  },
  cicloItem: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    paddingVertical: theme.spacing.sm,
  },
  cicloSeta: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.musgo,
  },
  checklist: {
    width: '100%',
    gap: theme.spacing.sm,
  },
  checklistLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  checklistCaixa: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.colors.musgo,
  },
  checklistCaixaMarcada: {
    backgroundColor: theme.colors.musgo,
  },
  checklistTexto: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
  },
  checklistTextoConcluido: {
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
});
