import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { SplashScreen, DURACAO_SPLASH_MS } from './SplashScreen';
import { MENSAGENS_SPLASH } from '../../utils/splashMessages';

describe('SplashScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('mostra o ícone de progresso e uma das frases do banco local', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    await render(<SplashScreen onAnimationEnd={jest.fn()} />);

    expect(screen.getByText(MENSAGENS_SPLASH[0])).toBeTruthy();
    expect(screen.getByTestId('root-progress-icon')).toBeTruthy();
  });

  it('não chama onAnimationEnd antes da duração mínima da splash', async () => {
    const onAnimationEnd = jest.fn();
    await render(<SplashScreen onAnimationEnd={onAnimationEnd} />);

    await act(async () => {
      jest.advanceTimersByTime(DURACAO_SPLASH_MS - 1);
    });

    expect(onAnimationEnd).not.toHaveBeenCalled();
  });

  it('chama onAnimationEnd uma única vez ao completar a duração mínima', async () => {
    const onAnimationEnd = jest.fn();
    await render(<SplashScreen onAnimationEnd={onAnimationEnd} />);

    await act(async () => {
      jest.advanceTimersByTime(DURACAO_SPLASH_MS);
    });
    expect(onAnimationEnd).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(onAnimationEnd).toHaveBeenCalledTimes(1);
  });

  it('cancela o aviso pendente se desmontar antes da hora', async () => {
    const onAnimationEnd = jest.fn();
    const { unmount } = await render(
      <SplashScreen onAnimationEnd={onAnimationEnd} />,
    );

    await act(async () => {
      unmount();
    });
    await act(async () => {
      jest.advanceTimersByTime(DURACAO_SPLASH_MS + 1000);
    });

    expect(onAnimationEnd).not.toHaveBeenCalled();
  });
});
