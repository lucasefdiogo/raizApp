import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react-native';
import { AccessibilityDebugScreen } from './AccessibilityDebugScreen';

jest.mock('../../native/AccessibilityDetection');

const {
  isAccessibilityServiceEnabled,
  openAccessibilitySettings,
  subscribeToForegroundApp,
} = require('../../native/AccessibilityDetection');

describe('AccessibilityDebugScreen', () => {
  let emitirDeteccao: (packageName: string) => void = () => {};
  const removerListener = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    isAccessibilityServiceEnabled.mockResolvedValue(false);
    subscribeToForegroundApp.mockImplementation((cb: (p: string) => void) => {
      emitirDeteccao = cb;
      return removerListener;
    });
  });

  it('mostra "Serviço ativo" quando isAccessibilityServiceEnabled resolve true', async () => {
    isAccessibilityServiceEnabled.mockResolvedValue(true);
    await render(<AccessibilityDebugScreen />);

    await waitFor(() =>
      expect(screen.getByTestId('status-servico').props.children).toBe(
        'Serviço ativo',
      ),
    );
  });

  it('mostra "Serviço desativado" quando resolve false', async () => {
    isAccessibilityServiceEnabled.mockResolvedValue(false);
    await render(<AccessibilityDebugScreen />);

    await waitFor(() =>
      expect(screen.getByTestId('status-servico').props.children).toBe(
        'Serviço desativado',
      ),
    );
  });

  it('"Ativar nas configurações" chama openAccessibilitySettings', async () => {
    await render(<AccessibilityDebugScreen />);

    await fireEvent.press(screen.getByText('Ativar nas configurações'));

    expect(openAccessibilitySettings).toHaveBeenCalledTimes(1);
  });

  it('a lista adiciona pacotes detectados, mais recente no topo', async () => {
    await render(<AccessibilityDebugScreen />);
    await waitFor(() => expect(subscribeToForegroundApp).toHaveBeenCalled());

    expect(
      screen.getByText(/Nada detectado ainda/),
    ).toBeTruthy();

    await fireEvent(screen.getByText('Verificar de novo'), 'press'); // no-op, só garante que render tá vivo
    emitirDeteccao('com.instagram.android');
    await waitFor(() =>
      expect(screen.getByText('com.instagram.android')).toBeTruthy(),
    );

    emitirDeteccao('com.whatsapp');
    await waitFor(() => expect(screen.getByText('com.whatsapp')).toBeTruthy());

    const textos = screen
      .getAllByText(/^com\./)
      .map(no => no.props.children);
    expect(textos[0]).toBe('com.whatsapp');
    expect(textos[1]).toBe('com.instagram.android');
  });

  it('remove o listener ao desmontar', async () => {
    const resultado = await render(<AccessibilityDebugScreen />);
    await waitFor(() => expect(subscribeToForegroundApp).toHaveBeenCalled());

    await act(async () => {
      resultado.unmount();
    });

    expect(removerListener).toHaveBeenCalledTimes(1);
  });
});
