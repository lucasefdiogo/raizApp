import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react-native';
import { ProgressoScreen } from './ProgressoScreen';

jest.mock('../../hooks/useProgressoSemanal');
jest.mock('../../hooks/useDesafios');
jest.mock('../../hooks/useVoltarParaAbaHoje');
const { useProgressoSemanal } = require('../../hooks/useProgressoSemanal');
const { useDesafios } = require('../../hooks/useDesafios');

const recarregarPadrao = jest.fn().mockResolvedValue(undefined);
const recarregarDesafiosPadrao = jest.fn().mockResolvedValue(undefined);

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
  beforeEach(() => {
    recarregarPadrao.mockClear();
    recarregarDesafiosPadrao.mockClear();
    configurarDesafios();
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

    await render(<ProgressoScreen uid="uid-1" />);

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

    await render(<ProgressoScreen uid="uid-1" />);

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

    await render(<ProgressoScreen uid="uid-1" />);

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

    await render(<ProgressoScreen uid="uid-1" />);

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

    await render(<ProgressoScreen uid="uid-1" />);

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

    await render(<ProgressoScreen uid="uid-1" />);

    const scroll = screen.getByTestId('progresso-scroll');
    expect(scroll.props.refreshControl).toBeTruthy();

    await act(async () => {
      await scroll.props.refreshControl.props.onRefresh();
    });

    expect(recarregar).toHaveBeenCalledTimes(1);
    expect(recarregarDesafiosPadrao).toHaveBeenCalledTimes(1);
  });

  it('mostra os cards de desafio (semanal e mensal) quando diasTotaisAtivos > 0', async () => {
    useProgressoSemanal.mockReturnValue({
      historico: [{ data: '2026-09-14', status: 'pendente' }],
      streakAtual: 2,
      diasTotaisAtivos: 4,
      carregando: false,
      recarregar: recarregarPadrao,
    });

    await render(<ProgressoScreen uid="uid-1" />);

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

    await render(<ProgressoScreen uid="uid-1" />);

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

    await render(<ProgressoScreen uid="uid-1" />);

    expect(screen.getByText('Últimos 7 dias')).toBeTruthy();
    expect(screen.queryByText('Desafios')).toBeNull();
  });
});
