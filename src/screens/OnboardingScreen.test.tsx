import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingScreen } from './OnboardingScreen';

jest.mock('../services/firestore');
jest.mock('../hooks/useToast');
const {
  buscarUsuario,
  atualizarDadosOnboarding,
} = require('../services/firestore');
const { useToast } = require('../hooks/useToast');

const showToast = jest.fn();

const TITULO_FOCO = 'Onde a procrastinação mais aparece';
const TITULO_TEMPO = 'Quanto tempo de tela por dia, hoje';
const LABEL_PORQUE = 'Por que você quer estar aqui';

function usuario(overrides = {}) {
  return {
    focoProcrastinacao: null,
    tempoTelaEstimado: null,
    porqueTexto: null,
    ...overrides,
  };
}

describe('OnboardingScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    buscarUsuario.mockResolvedValue(usuario());
    atualizarDadosOnboarding.mockResolvedValue(undefined);
    useToast.mockReturnValue({ showToast });
  });

  it('sem dado nenhum: retoma no passo do foco', async () => {
    await render(<OnboardingScreen uid="uid-1" onConcluir={jest.fn()} />);
    expect(await screen.findByText(TITULO_FOCO)).toBeTruthy();
  });

  it('já tem foco mas não o tempo de tela: retoma no passo do tempo', async () => {
    buscarUsuario.mockResolvedValue(usuario({ focoProcrastinacao: 'estudos' }));

    await render(<OnboardingScreen uid="uid-1" onConcluir={jest.fn()} />);

    expect(await screen.findByText(TITULO_TEMPO)).toBeTruthy();
    expect(screen.queryByText(TITULO_FOCO)).toBeNull();
  });

  it('já tem foco e tempo, falta o porquê: retoma no passo do porquê', async () => {
    buscarUsuario.mockResolvedValue(
      usuario({ focoProcrastinacao: 'estudos', tempoTelaEstimado: 4 }),
    );

    await render(<OnboardingScreen uid="uid-1" onConcluir={jest.fn()} />);

    expect(await screen.findByText(LABEL_PORQUE)).toBeTruthy();
    expect(screen.queryByText(TITULO_TEMPO)).toBeNull();
  });

  it('pré-preenche o foco já respondido ao voltar do passo do tempo', async () => {
    buscarUsuario.mockResolvedValue(usuario({ focoProcrastinacao: 'estudos' }));

    await render(<OnboardingScreen uid="uid-1" onConcluir={jest.fn()} />);
    await screen.findByText(TITULO_TEMPO);

    await fireEvent.press(screen.getByText('Voltar'));

    expect(screen.getByText(TITULO_FOCO)).toBeTruthy();
    expect(
      screen.getByRole('radio', { name: 'Estudos' }).props.accessibilityState
        .selected,
    ).toBe(true);
  });

  it('bloqueia o avanço no passo do foco até uma opção ser escolhida', async () => {
    const onConcluir = jest.fn();
    await render(<OnboardingScreen uid="uid-1" onConcluir={onConcluir} />);
    await screen.findByText(TITULO_FOCO);

    await fireEvent.press(screen.getByText('Continuar'));

    expect(screen.getByText(TITULO_FOCO)).toBeTruthy();
    expect(atualizarDadosOnboarding).not.toHaveBeenCalled();
  });

  it('"Continuar" só navega DEPOIS que a gravação resolve — não antes', async () => {
    let resolverGravacao: () => void = () => {};
    atualizarDadosOnboarding.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          resolverGravacao = resolve;
        }),
    );

    await render(<OnboardingScreen uid="uid-1" onConcluir={jest.fn()} />);
    await screen.findByText(TITULO_FOCO);

    await fireEvent.press(screen.getByText('Estudos'));
    // não dá await no press: a gravação mockada nunca resolve de propósito
    await act(async () => {
      fireEvent.press(screen.getByText('Continuar'));
    });

    // gravação ainda pendente -> continua no passo do foco
    expect(screen.getByText(TITULO_FOCO)).toBeTruthy();
    expect(screen.queryByText(TITULO_TEMPO)).toBeNull();
    expect(atualizarDadosOnboarding).toHaveBeenCalledWith('uid-1', {
      focoProcrastinacao: 'estudos',
    });

    await act(async () => {
      resolverGravacao();
    });

    expect(screen.getByText(TITULO_TEMPO)).toBeTruthy();
  });

  it('"Continuar" não navega se a gravação falhar, e dispara um toast', async () => {
    atualizarDadosOnboarding.mockRejectedValue(new Error('offline'));

    await render(<OnboardingScreen uid="uid-1" onConcluir={jest.fn()} />);
    await screen.findByText(TITULO_FOCO);

    await fireEvent.press(screen.getByText('Estudos'));
    await fireEvent.press(screen.getByText('Continuar'));

    expect(screen.getByText(TITULO_FOCO)).toBeTruthy();
    expect(screen.queryByText(TITULO_TEMPO)).toBeNull();
    expect(showToast).toHaveBeenCalledWith(
      'Não conseguimos salvar agora. Tente de novo.',
    );
  });

  it('não dispara toast quando a gravação de um passo sucede', async () => {
    await render(<OnboardingScreen uid="uid-1" onConcluir={jest.fn()} />);
    await screen.findByText(TITULO_FOCO);

    await fireEvent.press(screen.getByText('Estudos'));
    await fireEvent.press(screen.getByText('Continuar'));

    await screen.findByText(TITULO_TEMPO);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('grava cada passo no Firestore e chama onConcluir ao terminar os três', async () => {
    const onConcluir = jest.fn();
    await render(<OnboardingScreen uid="uid-1" onConcluir={onConcluir} />);
    await screen.findByText(TITULO_FOCO);

    await fireEvent.press(screen.getByText('Estudos'));
    await fireEvent.press(screen.getByText('Continuar'));

    await fireEvent.press(screen.getByText('4h'));
    await fireEvent.press(screen.getByText('Continuar'));

    await fireEvent.changeText(
      screen.getByLabelText('Seu porquê pessoal'),
      'Quero terminar meus estudos',
    );
    await fireEvent.press(screen.getByText('Concluir'));

    expect(atualizarDadosOnboarding.mock.calls).toEqual([
      ['uid-1', { focoProcrastinacao: 'estudos' }],
      ['uid-1', { tempoTelaEstimado: 4 }],
      ['uid-1', { porqueTexto: 'Quero terminar meus estudos' }],
    ]);
    expect(onConcluir).toHaveBeenCalledTimes(1);
  });
});
