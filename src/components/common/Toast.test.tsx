import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toast } from './Toast';

function renderToast(props: React.ComponentProps<typeof Toast>) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 320, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <Toast {...props} />
    </SafeAreaProvider>,
  );
}

describe('Toast', () => {
  it('renderiza a mensagem recebida', async () => {
    await renderToast({ mensagem: 'Não conseguimos salvar', onFechar: jest.fn() });
    expect(screen.getByText('Não conseguimos salvar')).toBeTruthy();
  });

  it('chama onFechar ao toque', async () => {
    const onFechar = jest.fn();
    await renderToast({ mensagem: 'Erro de rede', onFechar });

    await fireEvent.press(screen.getByTestId('toast'));
    expect(onFechar).toHaveBeenCalledTimes(1);
  });
});
