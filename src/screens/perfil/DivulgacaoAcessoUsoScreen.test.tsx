import React from 'react';
import { AppState } from 'react-native';
import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { DivulgacaoAcessoUsoScreen } from './DivulgacaoAcessoUsoScreen';

jest.mock('../../hooks/useConsentimentoAcessoUso');
jest.mock('../../hooks/useAcessoUso');

const {
  useConsentimentoAcessoUso,
} = require('../../hooks/useConsentimentoAcessoUso');
const { useAcessoUso } = require('../../hooks/useAcessoUso');

const AVISO =
  'Acesso de uso desligado. O bloqueio continua funcionando, só sem medir o tempo.';

describe('DivulgacaoAcessoUsoScreen', () => {
  let ouvinte: ((estado: string) => void) | undefined;

  beforeEach(() => {
    jest.resetAllMocks();
    ouvinte = undefined;
    useAcessoUso.mockReturnValue({ concedido: false, carregando: false });
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((
      _tipo: string,
      fn: (estado: string) => void,
    ) => {
      ouvinte = fn;
      return { remove: jest.fn() };
    }) as never);
  });

  it('mostra título, corpo e botões exatos do estado normal, sem o aviso', async () => {
    useConsentimentoAcessoUso.mockReturnValue({
      permitir: jest.fn().mockResolvedValue(true),
    });
    await render(
      <DivulgacaoAcessoUsoScreen uid="uid-1" onVoltar={jest.fn()} />,
    );

    expect(screen.getByText('Medir seu tempo nas redes')).toBeTruthy();
    expect(
      screen.getByText(
        'Para mostrar quanto tempo você passa nas redes sociais, o Rootora usa o acesso de uso do Android. Medimos só os apps da lista de redes sociais: tempo de uso e quantas vezes cada um foi aberto. Os dados ficam na sua conta e são apagados se você excluir a conta.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Permitir acesso de uso')).toBeTruthy();
    expect(screen.getByText('Agora não')).toBeTruthy();
    expect(screen.queryByText(AVISO)).toBeNull();
  });

  it('CA-05: "Permitir acesso de uso" chama permitir (grava consentimento e abre configurações)', async () => {
    const permitir = jest.fn().mockResolvedValue(true);
    useConsentimentoAcessoUso.mockReturnValue({ permitir });
    const onVoltar = jest.fn();
    await render(<DivulgacaoAcessoUsoScreen uid="uid-1" onVoltar={onVoltar} />);

    await fireEvent.press(screen.getByText('Permitir acesso de uso'));

    expect(permitir).toHaveBeenCalledTimes(1);
    expect(onVoltar).not.toHaveBeenCalled();
  });

  it('CA-05: "Agora não" só volta, sem gravar nada', async () => {
    const permitir = jest.fn().mockResolvedValue(true);
    useConsentimentoAcessoUso.mockReturnValue({ permitir });
    const onVoltar = jest.fn();
    await render(<DivulgacaoAcessoUsoScreen uid="uid-1" onVoltar={onVoltar} />);

    await fireEvent.press(screen.getByText('Agora não'));

    expect(onVoltar).toHaveBeenCalledTimes(1);
    expect(permitir).not.toHaveBeenCalled();
  });

  it('CA-07: ao voltar das configurações sem conceder, mostra o aviso e mantém o botão', async () => {
    useConsentimentoAcessoUso.mockReturnValue({
      permitir: jest.fn().mockResolvedValue(true),
    });
    await render(
      <DivulgacaoAcessoUsoScreen uid="uid-1" onVoltar={jest.fn()} />,
    );

    await fireEvent.press(screen.getByText('Permitir acesso de uso'));
    expect(screen.queryByText(AVISO)).toBeNull();

    await act(async () => {
      ouvinte?.('active');
    });

    expect(screen.getByText(AVISO)).toBeTruthy();
    expect(screen.getByText('Permitir acesso de uso')).toBeTruthy();
  });

  it('CA-07: se a falha ao gravar impediu abrir as configurações, não mostra o aviso', async () => {
    useConsentimentoAcessoUso.mockReturnValue({
      permitir: jest.fn().mockResolvedValue(false),
    });
    await render(
      <DivulgacaoAcessoUsoScreen uid="uid-1" onVoltar={jest.fn()} />,
    );

    await fireEvent.press(screen.getByText('Permitir acesso de uso'));
    await act(async () => {
      ouvinte?.('active');
    });

    expect(screen.queryByText(AVISO)).toBeNull();
  });
});
