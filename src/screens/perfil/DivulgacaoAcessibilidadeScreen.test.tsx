import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DivulgacaoAcessibilidadeScreen } from './DivulgacaoAcessibilidadeScreen';

jest.mock('../../hooks/useConsentimentoAcessibilidade');
jest.mock('../../hooks/useAccessibilityPermission');
jest.mock('../../native/AccessibilityDetection');

const {
  useConsentimentoAcessibilidade,
} = require('../../hooks/useConsentimentoAcessibilidade');
const { useAccessibilityPermission } = require('../../hooks/useAccessibilityPermission');
const { openAccessibilitySettings } = require('../../native/AccessibilityDetection');

function configurarPermissaoPadrao(sobrescritas = {}) {
  useAccessibilityPermission.mockReturnValue({
    ativo: false,
    carregando: false,
    verificarNovamente: jest.fn(),
    abrirConfiguracoes: jest.fn(),
    ...sobrescritas,
  });
}

describe('DivulgacaoAcessibilidadeScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    configurarPermissaoPadrao();
  });

  it('mostra o indicador de carregamento enquanto o status do serviço resolve', async () => {
    useConsentimentoAcessibilidade.mockReturnValue({
      concordarEAtivar: jest.fn().mockResolvedValue(true),
    });
    configurarPermissaoPadrao({ carregando: true });
    await render(<DivulgacaoAcessibilidadeScreen uid="uid-1" onVoltar={jest.fn()} />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  it('mostra o título e as 4 frases exatas da divulgação, em qualquer estado', async () => {
    useConsentimentoAcessibilidade.mockReturnValue({
      concordarEAtivar: jest.fn().mockResolvedValue(true),
    });
    await render(<DivulgacaoAcessibilidadeScreen uid="uid-1" onVoltar={jest.fn()} />);

    expect(screen.getByText('Como o bloqueio funciona')).toBeTruthy();
    expect(
      screen.getByText(
        'Para interceptar um app, o Rootora usa o serviço de acessibilidade do Android.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Ele identifica apenas qual app foi aberto, para mostrar sua tarefa do dia no lugar dele.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText('Não lê o que você digita e não vê o conteúdo das telas.'),
    ).toBeTruthy();
    expect(
      screen.getByText('O Rootora registra quais apps foram interceptados e quando.'),
    ).toBeTruthy();
  });

  describe('serviço desativado', () => {
    it('renderiza "Concordo e quero ativar" e "Agora não", sem selo nem link de configurações', async () => {
      useConsentimentoAcessibilidade.mockReturnValue({
        concordarEAtivar: jest.fn().mockResolvedValue(true),
      });
      configurarPermissaoPadrao({ ativo: false });
      await render(<DivulgacaoAcessibilidadeScreen uid="uid-1" onVoltar={jest.fn()} />);

      expect(screen.getByText('Concordo e quero ativar')).toBeTruthy();
      expect(screen.getByText('Agora não')).toBeTruthy();
      expect(screen.queryByText('ATIVO')).toBeNull();
      expect(screen.queryByText('Entendi')).toBeNull();
      expect(screen.queryByText('Abrir configurações do Android')).toBeNull();
    });

    it('"Concordo e quero ativar" chama concordarEAtivar e depois onVoltar', async () => {
      const concordarEAtivar = jest.fn().mockResolvedValue(true);
      const onVoltar = jest.fn();
      useConsentimentoAcessibilidade.mockReturnValue({ concordarEAtivar });
      configurarPermissaoPadrao({ ativo: false });
      await render(<DivulgacaoAcessibilidadeScreen uid="uid-1" onVoltar={onVoltar} />);

      await fireEvent.press(screen.getByText('Concordo e quero ativar'));

      expect(concordarEAtivar).toHaveBeenCalledTimes(1);
      expect(onVoltar).toHaveBeenCalledTimes(1);
    });

    it('"Agora não" chama só onVoltar, sem concordarEAtivar — não grava consentimento', async () => {
      const concordarEAtivar = jest.fn().mockResolvedValue(true);
      const onVoltar = jest.fn();
      useConsentimentoAcessibilidade.mockReturnValue({ concordarEAtivar });
      configurarPermissaoPadrao({ ativo: false });
      await render(<DivulgacaoAcessibilidadeScreen uid="uid-1" onVoltar={onVoltar} />);

      await fireEvent.press(screen.getByText('Agora não'));

      expect(onVoltar).toHaveBeenCalledTimes(1);
      expect(concordarEAtivar).not.toHaveBeenCalled();
    });

    it('se concordarEAtivar falhar (resolve false), fica na tela em vez de voltar', async () => {
      const concordarEAtivar = jest.fn().mockResolvedValue(false);
      const onVoltar = jest.fn();
      useConsentimentoAcessibilidade.mockReturnValue({ concordarEAtivar });
      configurarPermissaoPadrao({ ativo: false });
      await render(<DivulgacaoAcessibilidadeScreen uid="uid-1" onVoltar={onVoltar} />);

      await fireEvent.press(screen.getByText('Concordo e quero ativar'));

      expect(concordarEAtivar).toHaveBeenCalledTimes(1);
      expect(onVoltar).not.toHaveBeenCalled();
    });
  });

  describe('serviço ativo', () => {
    it('renderiza o selo ATIVO, "Entendi" e o link de configurações — sem os botões de consentimento', async () => {
      useConsentimentoAcessibilidade.mockReturnValue({
        concordarEAtivar: jest.fn().mockResolvedValue(true),
      });
      configurarPermissaoPadrao({ ativo: true });
      await render(<DivulgacaoAcessibilidadeScreen uid="uid-1" onVoltar={jest.fn()} />);

      expect(screen.getByText('ATIVO')).toBeTruthy();
      expect(screen.getByText('Entendi')).toBeTruthy();
      expect(screen.getByText('Abrir configurações do Android')).toBeTruthy();
      expect(screen.queryByText('Concordo e quero ativar')).toBeNull();
      expect(screen.queryByText('Agora não')).toBeNull();
    });

    it('"Entendi" chama onVoltar (goBack) e nunca concordarEAtivar', async () => {
      const concordarEAtivar = jest.fn().mockResolvedValue(true);
      const onVoltar = jest.fn();
      useConsentimentoAcessibilidade.mockReturnValue({ concordarEAtivar });
      configurarPermissaoPadrao({ ativo: true });
      await render(<DivulgacaoAcessibilidadeScreen uid="uid-1" onVoltar={onVoltar} />);

      await fireEvent.press(screen.getByText('Entendi'));

      expect(onVoltar).toHaveBeenCalledTimes(1);
      expect(concordarEAtivar).not.toHaveBeenCalled();
    });

    it('"Abrir configurações do Android" abre as configurações direto, sem gravar consentimento', async () => {
      const concordarEAtivar = jest.fn().mockResolvedValue(true);
      useConsentimentoAcessibilidade.mockReturnValue({ concordarEAtivar });
      configurarPermissaoPadrao({ ativo: true });
      await render(<DivulgacaoAcessibilidadeScreen uid="uid-1" onVoltar={jest.fn()} />);

      await fireEvent.press(screen.getByText('Abrir configurações do Android'));

      expect(openAccessibilitySettings).toHaveBeenCalledTimes(1);
      expect(concordarEAtivar).not.toHaveBeenCalled();
    });
  });
});
