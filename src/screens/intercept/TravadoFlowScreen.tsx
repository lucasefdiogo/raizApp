import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { EstadoTravado, OrigemSessaoFoco, Tarefa } from '../../domain/types';
import { useTravadoFlow } from '../../hooks/useTravadoFlow';
import { Chip } from '../../components/intercept/Chip';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SecondaryButton } from '../../components/SecondaryButton';
import { SessaoFocoScreen } from './SessaoFocoScreen';
import { logTravadoAberto, logTravadoEstado } from '../../services/analytics';

const CHIPS: { estado: EstadoTravado; titulo: string }[] = [
  { estado: 'confusao', titulo: 'Não sei por onde começar' },
  { estado: 'medo', titulo: 'Tenho medo de ficar ruim' },
  { estado: 'tedio', titulo: 'Está chato demais' },
  { estado: 'energia', titulo: 'Estou sem energia' },
];

const TEXTO_PASSO2: Record<EstadoTravado, string> = {
  confusao: 'Qual é o primeiro passo físico? Algo que dá para fazer em 2 minutos.',
  medo: 'Faça a versão feia primeiro. Ninguém vai ver o rascunho.',
  tedio: 'Não precisa gostar. São 5 minutos, e você pode parar depois.',
  energia: 'Energia baixa também é informação. Escolha o que cabe hoje.',
};

type AcaoEnergia = 'nenhuma' | 'versaoMenor' | 'amanha';

interface TravadoFlowScreenProps {
  uid: string;
  /** Tarefa que estava travando — null quando não há essencial pendente hoje (ver selecionarTarefaIntercept). */
  tarefaContexto: Tarefa | null;
  tarefas: Tarefa[];
  origem: OrigemSessaoFoco;
  criarSubtarefa: (titulo: string, tarefaPaiId?: string) => string | null;
  editarTarefa: (id: string, campos: Partial<Pick<Tarefa, 'titulo'>>) => void;
  moverTarefaParaAmanha: (tarefa: Tarefa, quando?: string) => Promise<void>;
  alternarTarefa: (id: string) => void;
  onFechar: () => void;
}

/**
 * Componente único do TravadoFlow (seção 4 da spec 09-ponte-fuga-tarefa),
 * reutilizado nas 3 entradas (botão discreto da Home, toque longo no
 * TaskCard e — Etapa 3 — a ação secundária da InterceptScreen). Estado
 * interno tipo máquina de passos, mesmo espírito do Onboarding. Só existe
 * na árvore enquanto está aberto — quem chama monta/desmonta (com uma
 * `key` nova a cada abertura, mesmo padrão de deteccaoId em
 * useAppBlocking), então cada abertura começa sempre do passo `escolha`,
 * sem precisar resetar estado manualmente.
 */
export function TravadoFlowScreen({
  uid,
  tarefaContexto,
  tarefas,
  origem,
  criarSubtarefa,
  editarTarefa,
  moverTarefaParaAmanha,
  alternarTarefa,
  onFechar,
}: TravadoFlowScreenProps) {
  const {
    passo,
    estadoSelecionado,
    temTarefaContexto,
    selecionarEstado,
    voltar,
    iniciarConfusao,
    iniciarMedoOuTedio,
    iniciarDescanso,
    salvarVersaoMenor,
    moverParaAmanha,
    parametrosSessao,
  } = useTravadoFlow({
    tarefaContexto,
    criarSubtarefa,
    editarTarefa,
    moverTarefaParaAmanha,
  });

  const [rascunhoSubtarefa, setRascunhoSubtarefa] = useState('');
  const [acaoEnergia, setAcaoEnergia] = useState<AcaoEnergia>('nenhuma');
  const [rascunhoVersaoMenor, setRascunhoVersaoMenor] = useState(
    tarefaContexto?.titulo ?? '',
  );
  const [rascunhoQuando, setRascunhoQuando] = useState('');

  useEffect(() => {
    logTravadoAberto(origem);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao montar (ver comentário na assinatura do componente sobre remount por key); origem não muda durante a vida do componente.
  }, []);

  useEffect(() => {
    if (estadoSelecionado) {
      logTravadoEstado(estadoSelecionado);
    }
  }, [estadoSelecionado]);

  useEffect(() => {
    if (passo === 'concluido') {
      onFechar();
    }
  }, [passo, onFechar]);

  function handleTarefaConcluida(tarefaId: string | null) {
    if (!tarefaId) {
      return;
    }
    const tarefa = tarefas.find(item => item.id === tarefaId);
    if (tarefa && !tarefa.concluida) {
      alternarTarefa(tarefaId);
    }
  }

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onFechar}
      testID="travado-flow-modal"
    >
      <SafeAreaView style={styles.container}>
        {passo !== 'sessao' && (
          <View style={styles.cabecalho}>
            {passo === 'resposta' ? (
              <Pressable onPress={voltar} hitSlop={8} accessibilityRole="button">
                <Text style={styles.acaoCabecalho}>Voltar</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable onPress={onFechar} hitSlop={8} accessibilityRole="button">
              <Text style={styles.acaoCabecalho}>Fechar</Text>
            </Pressable>
          </View>
        )}

        {passo === 'escolha' && (
          <View style={styles.conteudo}>
            <Text style={styles.titulo}>O que está pegando agora?</Text>
            <View style={styles.chips}>
              {CHIPS.map(chip => (
                <Chip
                  key={chip.estado}
                  titulo={chip.titulo}
                  onPress={() => selecionarEstado(chip.estado)}
                />
              ))}
            </View>
          </View>
        )}

        {passo === 'resposta' && estadoSelecionado && (
          <View style={styles.conteudo}>
            <Text style={styles.titulo}>{TEXTO_PASSO2[estadoSelecionado]}</Text>

            {estadoSelecionado === 'confusao' && (
              <>
                <TextField
                  label="Primeiro passo"
                  placeholder="abrir o arquivo, separar o material"
                  value={rascunhoSubtarefa}
                  onChangeText={setRascunhoSubtarefa}
                  returnKeyType="done"
                />
                <PrimaryButton
                  titulo="Fazer agora"
                  onPress={() => iniciarConfusao(rascunhoSubtarefa.trim())}
                  desabilitado={rascunhoSubtarefa.trim().length === 0}
                />
              </>
            )}

            {estadoSelecionado === 'medo' && (
              <PrimaryButton titulo="Começar rascunho" onPress={iniciarMedoOuTedio} />
            )}

            {estadoSelecionado === 'tedio' && (
              <PrimaryButton titulo="Começar" onPress={iniciarMedoOuTedio} />
            )}

            {estadoSelecionado === 'energia' && acaoEnergia === 'nenhuma' && (
              <View style={styles.acoesEnergia}>
                {temTarefaContexto && (
                  <SecondaryButton
                    titulo="Fazer uma versão menor"
                    onPress={() => setAcaoEnergia('versaoMenor')}
                  />
                )}
                <PrimaryButton
                  titulo="Descansar 10 minutos longe do celular"
                  onPress={iniciarDescanso}
                />
                {temTarefaContexto && (
                  <SecondaryButton
                    titulo="Passar para amanhã"
                    onPress={() => setAcaoEnergia('amanha')}
                  />
                )}
              </View>
            )}

            {estadoSelecionado === 'energia' && acaoEnergia === 'versaoMenor' && (
              <>
                <TextField
                  label="Versão menor da tarefa"
                  value={rascunhoVersaoMenor}
                  onChangeText={setRascunhoVersaoMenor}
                  returnKeyType="done"
                />
                <PrimaryButton
                  titulo="Salvar"
                  onPress={() => salvarVersaoMenor(rascunhoVersaoMenor.trim())}
                  desabilitado={rascunhoVersaoMenor.trim().length === 0}
                />
              </>
            )}

            {estadoSelecionado === 'energia' && acaoEnergia === 'amanha' && (
              <>
                <TextField
                  label="Horário (opcional)"
                  placeholder="HH:mm"
                  value={rascunhoQuando}
                  onChangeText={setRascunhoQuando}
                  returnKeyType="done"
                />
                <PrimaryButton
                  titulo="Passar para amanhã"
                  onPress={() =>
                    moverParaAmanha(
                      rascunhoQuando.trim().length > 0
                        ? rascunhoQuando.trim()
                        : undefined,
                    )
                  }
                />
              </>
            )}
          </View>
        )}

        {passo === 'sessao' && parametrosSessao && (
          <SessaoFocoScreen
            uid={uid}
            duracaoInicialSeg={parametrosSessao.duracaoPlanejadaSeg}
            tarefaId={parametrosSessao.tarefaId}
            origem={origem}
            estadoTravado={parametrosSessao.estadoTravado}
            onMarcarTarefaComoFeita={() =>
              handleTarefaConcluida(parametrosSessao.tarefaId)
            }
            onFechar={onFechar}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  acaoCabecalho: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textSecondary,
  },
  conteudo: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    justifyContent: 'center',
  },
  titulo: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.headingBold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  chips: {
    gap: theme.spacing.md,
  },
  acoesEnergia: {
    gap: theme.spacing.md,
  },
});
