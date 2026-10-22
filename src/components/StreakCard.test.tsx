import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { StreakCard } from './StreakCard';

const streakBase = {
  streakAtual: 4,
};

describe('StreakCard', () => {
  it('mostra o valor atual do streak', async () => {
    await render(<StreakCard streak={streakBase} />);
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('dias seguidos')).toBeTruthy();
  });

  it('usa singular quando o streak é 1', async () => {
    await render(<StreakCard streak={{ ...streakBase, streakAtual: 1 }} />);
    expect(screen.getByText('dia seguido')).toBeTruthy();
  });

  describe('HU-07 · rodapé de garantia do dia (RN04/RN05)', () => {
    it('hojeCumprido ausente: rodapé pede pra concluir 1 essencial', async () => {
      await render(<StreakCard streak={streakBase} />);
      expect(
        screen.getByText('Conclua 1 essencial para garantir hoje'),
      ).toBeTruthy();
      expect(screen.queryByText('Hoje já está garantido')).toBeNull();
    });

    it('hojeCumprido=false: rodapé pede pra concluir 1 essencial', async () => {
      await render(<StreakCard streak={streakBase} hojeCumprido={false} />);
      expect(
        screen.getByText('Conclua 1 essencial para garantir hoje'),
      ).toBeTruthy();
    });

    it('hojeCumprido=true: rodapé diz que hoje já está garantido, sem mudar o número do streak', async () => {
      await render(<StreakCard streak={streakBase} hojeCumprido={true} />);
      expect(screen.getByText('Hoje já está garantido')).toBeTruthy();
      expect(
        screen.queryByText('Conclua 1 essencial para garantir hoje'),
      ).toBeNull();
      expect(screen.getByText('4')).toBeTruthy();
    });
  });

  describe('raiz visual (RootProgressIcon)', () => {
    it('renderiza a raiz com a altura correspondente ao streakAtual', async () => {
      await render(<StreakCard streak={streakBase} />);
      expect(screen.getByTestId('root-progress-icon')).toBeTruthy();
    });

    it('hojeCumprido=true: a raiz fica mais alta do que sem cumprir (+1 dia visual, sem mudar o número)', async () => {
      const { rerender } = await render(
        <StreakCard streak={streakBase} hojeCumprido={false} />,
      );
      const caminhoSemCumprir =
        screen.getByTestId('root-progress-icon-caule').props.d;

      await act(async () => {
        rerender(<StreakCard streak={streakBase} hojeCumprido={true} />);
      });
      const caminhoComCumprir =
        screen.getByTestId('root-progress-icon-caule').props.d;

      expect(caminhoComCumprir).not.toBe(caminhoSemCumprir);
      // Número exibido continua o mesmo — só a raiz reflete o "+1" visual.
      expect(screen.getByText('4')).toBeTruthy();
    });
  });
});
