import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { TaskCompletedOverlay } from './TaskCompletedOverlay';

describe('TaskCompletedOverlay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('não renderiza nada quando visible é false', async () => {
    await render(
      <TaskCompletedOverlay
        visible={false}
        mensagem="Feito. Isso conta."
        onHide={jest.fn()}
      />,
    );
    expect(screen.queryByText('Feito. Isso conta.')).toBeNull();
  });

  it('mostra a mensagem recebida quando visible é true', async () => {
    await render(
      <TaskCompletedOverlay
        visible={true}
        mensagem="Mais um passo real."
        onHide={jest.fn()}
      />,
    );
    expect(screen.getByText('Mais um passo real.')).toBeTruthy();
  });

  it('chama onHide depois de ~1.5s', async () => {
    const onHide = jest.fn();
    await render(
      <TaskCompletedOverlay
        visible={true}
        mensagem="Feito. Isso conta."
        onHide={onHide}
      />,
    );

    expect(onHide).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('não chama onHide antes do tempo passar', async () => {
    const onHide = jest.fn();
    await render(
      <TaskCompletedOverlay
        visible={true}
        mensagem="Feito. Isso conta."
        onHide={onHide}
      />,
    );

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(onHide).not.toHaveBeenCalled();
  });
});
