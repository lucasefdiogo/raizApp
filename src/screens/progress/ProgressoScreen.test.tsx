import React from 'react';
import {
  render as rtlRender,
  screen,
  waitFor,
  act,
  fireEvent,
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProgressoScreen } from './ProgressoScreen';

jest.mock('../../hooks/useProgressoSemanal');
jest.mock('../../hooks/useDesafios');
jest.mock('../../hooks/useVoltarParaAbaHoje');
jest.mock('../../hooks/useDayDetail');
jest.mock('../../hooks/useResumoRedes');
jest.mock('../../services/analytics');
const { useProgressoSemanal } = require('../../hooks/useProgressoSemanal');
const { useDesafios } = require('../../hooks/useDesafios');
const { useDayDetail } = require('../../hooks/useDayDetail');
const { useResumoRedes } = require('../../hooks/useResumoRedes');
const AsyncStorage = require('@react-native-async-storage/async-storage');

// DayDetailSheet (aberto) lê useSafeAreaInsets, mesmo padrão de
// espaçamento do TaskActionsSheet — precisa do Provider.
function render(ui: React.ReactElement) {
  return rtlRender(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 320, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      {ui}
    </SafeAreaProvider>,
  );
}

const recarregarPadrao = jest.fn().mockResolvedValue(undefined);
const recarregarDesafiosPadrao = jest.fn().mockResolvedValue(undefined);
const recarregarResumoRedesPadrao = jest.fn().mockResolvedValue(undefined);
const buscarDiaPadrao = jest.fn();
const limparSelecaoPadrao = jest.fn();
const aoTocarMedirTempoPadrao = jest.fn();

function configurarDayDetail(sobrescritas = {}) {
  useDayDetail.mockReturnValue({
    dataSelecionada: null,
    tarefasDoDia: [],
    statusDoDia: null,
    detalheRedes: null,
    carregando: false,
    buscarDia: buscarDiaPadrao,
    limparSelecao: limparSelecaoPadrao,
    ...sobrescritas,
  });
}

const RESUMO_REDES_VAZIO = {
  contadores: { sessoesUsadas: 0, acessosRapidos: 0, emergencias: 0 },
  duracaoTotal: '',
  barras: [],
  comparacao: null,
};

function configurarResumoRedes(sobrescritas = {}) {
  useResumoRedes.mockReturnValue({
    resumoCard: RESUMO_REDES_VAZIO,
    reflexao: null,
    comAcessoDeUso: false,
    carregando: false,
    recarregar: recarregarResumoRedesPadrao,
    ...sobrescritas,
  });
}

const DESAFIO_SEMANAL = {
  id: 'exercicio_3x-2026-09-08',
  titulo: 'Exercite-se 3x essa semana',
  tipo: 'exercicio_3x' as const,
  periodo: 'semanal' as const,
  dataInicio: '2026-09-08',
  dataFim: '2026-09-14',
  meta: 3,
  progresso: 2,
  status: 'ativo' as const,
};
const DESAFIO_MENSAL = {
  id: 'dias_ativos_20-2026-09-01',
  titulo: '20 dias ativos esse mês',
  tipo: 'dias_ativos_20' as const,
  periodo: 'mensal' as const,
  dataInicio: '2026-09-01',
  dataFim: '2026-09-30',
  meta: 20,
  progresso: 8,
  status: 'ativo' as const,
};

function configurarDesafios(sobrescritas = {}) {
  useDesafios.mockReturnValue({
    desafioSemanal: DESAFIO_SEMANAL,
    desafioMensal: DESAFIO_MENSAL,
    carregando: false,
    recarregar: recarregarDesafiosPadrao,
    ...sobrescritas,
  });
}

describe('ProgressoScreen', () => {
  beforeEach(async () => {
    recarregarPadrao.mockClear();
    recarregarDesafiosPadrao.mockClear();
    recarregarResumoRedesPadrao.mockClear();
    buscarDiaPadrao.mockClear();
    limparSelecaoPadrao.mockClear();
    aoTocarMedirTempoPadrao.mockClear();
    await AsyncStorage.clear();
    configurarDesafios();
    configurarDayDetail();
    configurarResumoRedes();
  });
  it('mostra os 2 números de resumo e um DayStatusPill por dia do histórico', async () => {
    useProgressoSemanal.mockReturnValue({
      historico: [
        { data: '2026-09-08', status: 'cumprido' },
        { data: '2026-09-09', status: 'protegido_escudo' },
        { data: '2026-09-10', status: 'perdido' },
        { data: '2026-09-11', status: 'sem_registro' },
        { data: '2026-09-12', status: 'cumprido' },
        { data: '2026-09-13', status: 'cumprido' },
        { data: '2026-09-14', status: 'pendente' },
      ],
      streakAtual: 6,
      diasTotaisAtivos: 20,
      carregando: false,
      recarregar: recarregarPadrao,
    });

    await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

    await waitFor(() => expect(screen.getByText('6')).toBeTruthy());
    expect(screen.getByText('20')).toBeTruthy();
    expect(screen.getAllByTestId('day-status-pill-indicador')).toHaveLength(7);
    expect(screen.queryByTestId('loading-indicator')).toBeNull();
  });

  it('mostra o LoadingIndicator enquanto useProgressoSemanal ainda carrega, sem números de resumo', async () => {
    useProgressoSemanal.mockReturnValue({
      historico: [],
      streakAtual: 0,
      diasTotaisAtivos: 0,
      carregando: true,
      recarregar: recarregarPadrao,
    });

    await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(screen.getByText('Calculando seu progresso')).toBeTruthy();
    // o título fixo continua; os placeholders de resumo não aparecem
    expect(screen.getByText('Seu progresso')).toBeTruthy();
    expect(screen.queryByText('Últimos 7 dias')).toBeNull();
    expect(screen.queryAllByTestId('day-status-pill-indicador')).toHaveLength(0);
  });

  it('mostra o EmptyState quando diasTotaisAtivos é 0, mesmo com o histórico cheio de "sem_registro"', async () => {
    useProgressoSemanal.mockReturnValue({
      historico: [
        { data: '2026-09-08', status: 'sem_registro' },
        { data: '2026-09-09', status: 'sem_registro' },
        { data: '2026-09-10', status: 'sem_registro' },
        { data: '2026-09-11', status: 'sem_registro' },
        { data: '2026-09-12', status: 'sem_registro' },
        { data: '2026-09-13', status: 'sem_registro' },
        { data: '2026-09-14', status: 'pendente' },
      ],
      streakAtual: 0,
      diasTotaisAtivos: 0,
      carregando: false,
      recarregar: recarregarPadrao,
    });

    await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

    expect(screen.getByTestId('empty-state')).toBeTruthy();
    expect(screen.getByText('Seu progresso vai aparecer aqui')).toBeTruthy();
    // não é a grade em branco — a faixa de 7 dias não aparece
    expect(screen.queryByText('Últimos 7 dias')).toBeNull();
    expect(screen.queryAllByTestId('day-status-pill-indicador')).toHaveLength(0);
    // e não é o estado de carregando
    expect(screen.queryByTestId('loading-indicator')).toBeNull();
  });

  it('mostra a faixa de 7 dias (não o EmptyState) quando diasTotaisAtivos > 0, mesmo com dias "sem_registro" misturados', async () => {
    useProgressoSemanal.mockReturnValue({
      historico: [
        { data: '2026-09-08', status: 'cumprido' },
        { data: '2026-09-09', status: 'sem_registro' },
        { data: '2026-09-10', status: 'sem_registro' },
        { data: '2026-09-11', status: 'sem_registro' },
        { data: '2026-09-12', status: 'sem_registro' },
        { data: '2026-09-13', status: 'sem_registro' },
        { data: '2026-09-14', status: 'pendente' },
      ],
      streakAtual: 1,
      diasTotaisAtivos: 1,
      carregando: false,
      recarregar: recarregarPadrao,
    });

    await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

    expect(screen.queryByTestId('empty-state')).toBeNull();
    expect(screen.getByText('Últimos 7 dias')).toBeTruthy();
    expect(screen.getAllByTestId('day-status-pill-indicador')).toHaveLength(7);
  });

  it('não mostra o EmptyState enquanto carregando, mesmo com diasTotaisAtivos 0', async () => {
    useProgressoSemanal.mockReturnValue({
      historico: [],
      streakAtual: 0,
      diasTotaisAtivos: 0,
      carregando: true,
      recarregar: recarregarPadrao,
    });

    await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

    expect(screen.queryByTestId('empty-state')).toBeNull();
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  it('tem RefreshControl e o puxar-pra-atualizar aciona recarregar() de useProgressoSemanal', async () => {
    const recarregar = jest.fn().mockResolvedValue(undefined);
    useProgressoSemanal.mockReturnValue({
      historico: [
        { data: '2026-09-08', status: 'cumprido' },
        { data: '2026-09-09', status: 'sem_registro' },
        { data: '2026-09-10', status: 'sem_registro' },
        { data: '2026-09-11', status: 'sem_registro' },
        { data: '2026-09-12', status: 'sem_registro' },
        { data: '2026-09-13', status: 'sem_registro' },
        { data: '2026-09-14', status: 'pendente' },
      ],
      streakAtual: 3,
      diasTotaisAtivos: 5,
      carregando: false,
      recarregar,
    });

    await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

    const scroll = screen.getByTestId('progresso-scroll');
    expect(scroll.props.refreshControl).toBeTruthy();

    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    expect(recarregar).toHaveBeenCalledTimes(1);
    expect(recarregarDesafiosPadrao).toHaveBeenCalledTimes(1);
    expect(recarregarResumoRedesPadrao).toHaveBeenCalledTimes(1);
  });

  it('mostra os cards de desafio (semanal e mensal) quando diasTotaisAtivos > 0', async () => {
    useProgressoSemanal.mockReturnValue({
      historico: [{ data: '2026-09-14', status: 'pendente' }],
      streakAtual: 2,
      diasTotaisAtivos: 4,
      carregando: false,
      recarregar: recarregarPadrao,
    });

    await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

    expect(screen.getByText('Desafios')).toBeTruthy();
    expect(screen.getByText('Exercite-se 3x essa semana')).toBeTruthy();
    expect(screen.getByText('2 de 3')).toBeTruthy();
    expect(screen.getByText('20 dias ativos esse mês')).toBeTruthy();
    expect(screen.getByText('8 de 20')).toBeTruthy();
  });

  it('não mostra os cards de desafio no dia 0 (diasTotaisAtivos === 0)', async () => {
    useProgressoSemanal.mockReturnValue({
      historico: [{ data: '2026-09-14', status: 'pendente' }],
      streakAtual: 0,
      diasTotaisAtivos: 0,
      carregando: false,
      recarregar: recarregarPadrao,
    });

    await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

    expect(screen.getByTestId('empty-state')).toBeTruthy();
    expect(screen.queryByText('Desafios')).toBeNull();
    expect(screen.queryByText('Exercite-se 3x essa semana')).toBeNull();
  });

  it('não quebra quando ainda não há desafios resolvidos (ambos null)', async () => {
    configurarDesafios({ desafioSemanal: null, desafioMensal: null });
    useProgressoSemanal.mockReturnValue({
      historico: [{ data: '2026-09-14', status: 'pendente' }],
      streakAtual: 2,
      diasTotaisAtivos: 4,
      carregando: false,
      recarregar: recarregarPadrao,
    });

    await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

    expect(screen.getByText('Últimos 7 dias')).toBeTruthy();
    expect(screen.queryByText('Desafios')).toBeNull();
  });

  describe('detalhe do dia (tocar numa pastilha)', () => {
    beforeEach(() => {
      useProgressoSemanal.mockReturnValue({
        historico: [
          { data: '2026-09-08', status: 'cumprido' },
          { data: '2026-09-09', status: 'protegido_escudo' },
          { data: '2026-09-10', status: 'perdido' },
          { data: '2026-09-11', status: 'sem_registro' },
          { data: '2026-09-12', status: 'cumprido' },
          { data: '2026-09-13', status: 'cumprido' },
          { data: '2026-09-14', status: 'pendente' },
        ],
        streakAtual: 6,
        diasTotaisAtivos: 20,
        carregando: false,
        recarregar: recarregarPadrao,
      });
    });

    it('tocar numa pastilha "sem_registro" não chama buscarDia — não existe dailyLog pra abrir', async () => {
      await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

      await fireEvent.press(screen.getByTestId('day-pill-2026-09-11'));

      expect(buscarDiaPadrao).not.toHaveBeenCalled();
    });

    it('tocar numa pastilha "cumprido" chama buscarDia com a data certa', async () => {
      await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

      await fireEvent.press(screen.getByTestId('day-pill-2026-09-08'));

      expect(buscarDiaPadrao).toHaveBeenCalledWith('2026-09-08');
    });

    it('tocar numa pastilha "protegido_escudo" chama buscarDia com a data certa', async () => {
      await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

      await fireEvent.press(screen.getByTestId('day-pill-2026-09-09'));

      expect(buscarDiaPadrao).toHaveBeenCalledWith('2026-09-09');
    });

    it('tocar numa pastilha "perdido" chama buscarDia com a data certa', async () => {
      await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

      await fireEvent.press(screen.getByTestId('day-pill-2026-09-10'));

      expect(buscarDiaPadrao).toHaveBeenCalledWith('2026-09-10');
    });

    it('tocar numa pastilha "pendente" (hoje) chama buscarDia com a data certa', async () => {
      await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

      await fireEvent.press(screen.getByTestId('day-pill-2026-09-14'));

      expect(buscarDiaPadrao).toHaveBeenCalledWith('2026-09-14');
    });

    it('com um dia selecionado, mostra o DayDetailSheet com o label, status e tarefas certos', async () => {
      configurarDayDetail({
        dataSelecionada: '2026-09-08',
        statusDoDia: 'cumprido',
        tarefasDoDia: [
          { id: '1', titulo: 'Ler 5 páginas', essencial: true, concluida: true },
        ],
      });

      await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

      // 2026-09-08 é uma terça-feira
      expect(screen.getByText('Terça-feira · cumprido')).toBeTruthy();
      expect(screen.getByText('Ler 5 páginas')).toBeTruthy();
    });

    it('sem dia selecionado (dataSelecionada null): não mostra o DayDetailSheet', async () => {
      await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

      expect(screen.queryByText('Fechar')).toBeNull();
    });

    it('"Fechar" no painel chama limparSelecao', async () => {
      configurarDayDetail({
        dataSelecionada: '2026-09-08',
        statusDoDia: 'cumprido',
        tarefasDoDia: [],
      });

      await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

      await fireEvent.press(screen.getByText('Fechar'));

      expect(limparSelecaoPadrao).toHaveBeenCalledTimes(1);
    });
  });

  describe('HU-08 · ResumoRedesCard', () => {
    beforeEach(() => {
      useProgressoSemanal.mockReturnValue({
        historico: [{ data: '2026-09-14', status: 'pendente' }],
        streakAtual: 2,
        diasTotaisAtivos: 4,
        carregando: false,
        recarregar: recarregarPadrao,
      });
    });

    it('com acesso de uso, mostra o ResumoRedesCard com a duração da semana', async () => {
      configurarResumoRedes({
        comAcessoDeUso: true,
        resumoCard: { ...RESUMO_REDES_VAZIO, duracaoTotal: '6h 40min' },
      });

      await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

      expect(screen.getByText('Redes sociais · esta semana')).toBeTruthy();
      expect(screen.getByText('6h 40min')).toBeTruthy();
    });

    it('Cenário 3: sem acesso de uso, tocar em "Medir tempo" chama aoTocarMedirTempo', async () => {
      configurarResumoRedes({ comAcessoDeUso: false });

      await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

      await fireEvent.press(screen.getByText('Medir tempo'));

      expect(aoTocarMedirTempoPadrao).toHaveBeenCalledTimes(1);
    });

    it('enquanto useResumoRedes carrega, não mostra o card', async () => {
      configurarResumoRedes({ carregando: true });

      await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

      expect(screen.queryByTestId('resumo-redes-card')).toBeNull();
    });
  });

  describe('HU-08 · reflexão semanal (RN10, RN12)', () => {
    const REFLEXAO = {
      periodoLabel: 'Semana de 7 a 13 de set',
      duracaoTotal: '6h 40min',
      appPrincipalTexto: 'O Instagram ficou com mais da metade.',
      mediaPorDia: '57 min',
      diaMaisLongoAbreviado: 'qui',
      totalAberturas: 42,
    };

    beforeEach(() => {
      // Segunda-feira — mesma semana usada no restante deste arquivo.
      jest.useFakeTimers().setSystemTime(new Date('2026-09-14T12:00:00Z'));
      useProgressoSemanal.mockReturnValue({
        historico: [{ data: '2026-09-14', status: 'pendente' }],
        streakAtual: 2,
        diasTotaisAtivos: 4,
        carregando: false,
        recarregar: recarregarPadrao,
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('Cenário 10: com reflexão disponível e ainda não vista esta semana, mostra a sheet', async () => {
      configurarResumoRedes({ comAcessoDeUso: true, reflexao: REFLEXAO });

      await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

      await waitFor(() => expect(screen.getByText('Sua semana nas redes')).toBeTruthy());
    });

    it('Cenário 10: ao fechar com "Agora não", não aparece de novo na mesma semana', async () => {
      configurarResumoRedes({ comAcessoDeUso: true, reflexao: REFLEXAO });

      await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);
      await waitFor(() => expect(screen.getByText('Sua semana nas redes')).toBeTruthy());

      await fireEvent.press(screen.getByText('Agora não'));
      expect(screen.queryByText('Sua semana nas redes')).toBeNull();

      // "reabrir a aba" = montar a tela de novo (mesmo AsyncStorage, não resetado).
      await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);
      await waitFor(() => expect(screen.queryByText('Sua semana nas redes')).toBeNull());
    });

    it('Cenário 11: sem reflexão disponível (sem base de dados), não mostra a sheet', async () => {
      configurarResumoRedes({ comAcessoDeUso: true, reflexao: null });

      await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);

      expect(screen.queryByText('Sua semana nas redes')).toBeNull();
    });

    it('Cenário 13: "Entendi" registra o evento de analytics com a ação certa', async () => {
      const { logReflexaoSemanalFechada } = require('../../services/analytics');
      configurarResumoRedes({ comAcessoDeUso: true, reflexao: REFLEXAO });

      await render(<ProgressoScreen uid="uid-1" aoTocarMedirTempo={aoTocarMedirTempoPadrao} />);
      await waitFor(() => expect(screen.getByText('Sua semana nas redes')).toBeTruthy());

      await fireEvent.press(screen.getByText('Entendi'));

      expect(logReflexaoSemanalFechada).toHaveBeenCalledWith('entendi');
    });
  });
});
