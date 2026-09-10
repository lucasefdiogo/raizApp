import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { ProgressoScreen } from './ProgressoScreen';

jest.mock('../../hooks/useProgressoSemanal');
const { useProgressoSemanal } = require('../../hooks/useProgressoSemanal');

describe('ProgressoScreen', () => {
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
    });

    await render(<ProgressoScreen uid="uid-1" />);

    expect(screen.queryByTestId('empty-state')).toBeNull();
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });
});
