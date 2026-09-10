import React from 'react';
import { Pressable, Text } from 'react-native';
import { act, render, renderHook, screen, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider, DURACAO_TOAST_MS } from './ToastContext';
import { useToast } from '../hooks/useToast';

function Disparador({ mensagem, rotulo }: { mensagem: string; rotulo: string }) {
  const { showToast } = useToast();
  return (
    <Pressable onPress={() => showToast(mensagem)}>
      <Text>{rotulo}</Text>
    </Pressable>
  );
}

function renderComProvider(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 320, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <ToastProvider>{ui}</ToastProvider>
    </SafeAreaProvider>,
  );
}

describe('ToastProvider / useToast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('showToast deixa a mensagem visível', async () => {
    await renderComProvider(<Disparador mensagem="Falha ao salvar" rotulo="ir" />);
    expect(screen.queryByText('Falha ao salvar')).toBeNull();

    await fireEvent.press(screen.getByText('ir'));

    expect(screen.getByText('Falha ao salvar')).toBeTruthy();
  });

  it('disparar outro toast enquanto um está visível substitui (não empilha)', async () => {
    await renderComProvider(
      <>
        <Disparador mensagem="Primeiro" rotulo="a" />
        <Disparador mensagem="Segundo" rotulo="b" />
      </>,
    );

    await fireEvent.press(screen.getByText('a'));
    expect(screen.getByText('Primeiro')).toBeTruthy();

    await fireEvent.press(screen.getByText('b'));
    expect(screen.queryByText('Primeiro')).toBeNull();
    expect(screen.getByText('Segundo')).toBeTruthy();
  });

  it('some sozinho depois de DURACAO_TOAST_MS', async () => {
    await renderComProvider(<Disparador mensagem="Some depois" rotulo="ir" />);
    await fireEvent.press(screen.getByText('ir'));
    expect(screen.getByText('Some depois')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(DURACAO_TOAST_MS - 1);
    });
    expect(screen.queryByText('Some depois')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.queryByText('Some depois')).toBeNull();
  });

  it('substituir reinicia o cronômetro do auto-dismiss', async () => {
    await renderComProvider(
      <>
        <Disparador mensagem="Primeiro" rotulo="a" />
        <Disparador mensagem="Segundo" rotulo="b" />
      </>,
    );

    await fireEvent.press(screen.getByText('a'));
    await act(async () => {
      jest.advanceTimersByTime(DURACAO_TOAST_MS - 100);
    });
    await fireEvent.press(screen.getByText('b'));

    // se o cronômetro NÃO tivesse reiniciado, 100ms bastariam pra sumir
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.getByText('Segundo')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(DURACAO_TOAST_MS);
    });
    expect(screen.queryByText('Segundo')).toBeNull();
  });

  it('useToast fora de um ToastProvider lança erro', async () => {
    const spyErro = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(renderHook(() => useToast())).rejects.toThrow(/ToastProvider/);

    spyErro.mockRestore();
  });
});
