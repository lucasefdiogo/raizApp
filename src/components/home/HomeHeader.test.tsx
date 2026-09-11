import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { HomeHeader } from './HomeHeader';

describe('HomeHeader', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('saudação por horário', () => {
    it('antes de 12h: Bom dia', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-11T08:00:00'));
      await render(<HomeHeader nome="Ana" streakAtual={3} />);
      expect(screen.getByText('Bom dia, Ana')).toBeTruthy();
    });

    it('entre 12h e 18h: Boa tarde', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-11T14:00:00'));
      await render(<HomeHeader nome="Ana" streakAtual={3} />);
      expect(screen.getByText('Boa tarde, Ana')).toBeTruthy();
    });

    it('exatamente 18h: já conta como Boa noite', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-11T18:00:00'));
      await render(<HomeHeader nome="Ana" streakAtual={3} />);
      expect(screen.getByText('Boa noite, Ana')).toBeTruthy();
    });

    it('depois de 18h: Boa noite', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-11T21:00:00'));
      await render(<HomeHeader nome="Ana" streakAtual={3} />);
      expect(screen.getByText('Boa noite, Ana')).toBeTruthy();
    });

    it('exatamente 12h: já conta como Boa tarde', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-11T12:00:00'));
      await render(<HomeHeader nome="Ana" streakAtual={3} />);
      expect(screen.getByText('Boa tarde, Ana')).toBeTruthy();
    });
  });

  describe('nome vazio', () => {
    it('sem nome: só a saudação, sem vírgula ou espaço sobrando', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-11T08:00:00'));
      await render(<HomeHeader nome="" streakAtual={3} />);

      expect(screen.getByText('Bom dia')).toBeTruthy();
      expect(screen.queryByText(/,/)).toBeNull();
    });

    it('nome só com espaços: tratado como vazio', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-11T08:00:00'));
      await render(<HomeHeader nome="   " streakAtual={3} />);

      expect(screen.getByText('Bom dia')).toBeTruthy();
    });
  });

  describe('badge de streak', () => {
    it('mostra o ícone de broto, o número de dias e "dias"', async () => {
      await render(<HomeHeader nome="Ana" streakAtual={12} />);
      expect(screen.getByText('🌱 12 dias')).toBeTruthy();
    });

    it('reflete o streakAtual recebido, não um valor fixo', async () => {
      await render(<HomeHeader nome="Ana" streakAtual={0} />);
      expect(screen.getByText('🌱 0 dias')).toBeTruthy();
    });
  });
});
