import React from 'react';
import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import { AppBlockConfigScreen } from './AppBlockConfigScreen';

jest.mock('../../hooks/useAppBlockConfig');
jest.mock('../../hooks/useAccessibilityPermission');
const { useAppBlockConfig } = require('../../hooks/useAppBlockConfig');
const {
  useAccessibilityPermission,
} = require('../../hooks/useAccessibilityPermission');

const APPS_MOCK = [
  { packageName: 'com.instagram.android', nome: 'Instagram', icone: null },
  { packageName: 'com.whatsapp', nome: 'WhatsApp', icone: null },
];

function configurarHookPadrao(sobrescritas = {}) {
  useAppBlockConfig.mockReturnValue({
    appsInstalados: APPS_MOCK,
    configAtual: {
      ativo: false,
      appsSelecionados: [],
      horarioInicio: null,
      horarioFim: null,
    },
    carregando: false,
    alternarApp: jest.fn().mockResolvedValue(undefined),
    salvarHorario: jest.fn().mockResolvedValue(undefined),
    alternarAtivo: jest.fn().mockResolvedValue(undefined),
    recarregar: jest.fn().mockResolvedValue(undefined),
    ...sobrescritas,
  });
}

function configurarAcessibilidade(sobrescritas = {}) {
  useAccessibilityPermission.mockReturnValue({
    ativo: true,
    carregando: false,
    verificarNovamente: jest.fn().mockResolvedValue(undefined),
    abrirConfiguracoes: jest.fn(),
    ...sobrescritas,
  });
}

describe('AppBlockConfigScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    configurarHookPadrao();
    configurarAcessibilidade();
  });

  it('chama aoVoltar ao tocar no botão de voltar', async () => {
    const aoVoltar = jest.fn();
    await render(<AppBlockConfigScreen uid="uid-1" aoVoltar={aoVoltar} />);

    await fireEvent.press(screen.getByLabelText('Voltar'));

    expect(aoVoltar).toHaveBeenCalledTimes(1);
  });

  it('mostra o LoadingIndicator enquanto carrega, sem a lista', async () => {
    configurarHookPadrao({ carregando: true });
    await render(<AppBlockConfigScreen uid="uid-1" aoVoltar={jest.fn()} />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(screen.queryByText('Instagram')).toBeNull();
  });

  it('renderiza a lista de apps instalados a partir do hook', async () => {
    await render(<AppBlockConfigScreen uid="uid-1" aoVoltar={jest.fn()} />);

    expect(screen.getByText('Instagram')).toBeTruthy();
    expect(screen.getByText('WhatsApp')).toBeTruthy();
  });

  it('tocar num app chama alternarApp com o package certo', async () => {
    const alternarApp = jest.fn().mockResolvedValue(undefined);
    configurarHookPadrao({ alternarApp });
    await render(<AppBlockConfigScreen uid="uid-1" aoVoltar={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText('Instagram'));

    expect(alternarApp).toHaveBeenCalledWith('com.instagram.android');
  });

  it('o toggle geral chama alternarAtivo com o valor invertido', async () => {
    const alternarAtivo = jest.fn().mockResolvedValue(undefined);
    configurarHookPadrao({ alternarAtivo });
    await render(<AppBlockConfigScreen uid="uid-1" aoVoltar={jest.fn()} />);

    await fireEvent.press(screen.getByText('Ativar bloqueio de apps'));

    expect(alternarAtivo).toHaveBeenCalledWith(true);
  });

  it('reflete configAtual.ativo no checkbox geral', async () => {
    configurarHookPadrao({
      configAtual: {
        ativo: true,
        appsSelecionados: [],
        horarioInicio: null,
        horarioFim: null,
      },
    });
    await render(<AppBlockConfigScreen uid="uid-1" aoVoltar={jest.fn()} />);

    expect(
      screen.getByTestId('app-block-ativo-toggle').props.accessibilityState
        .checked,
    ).toBe(true);
  });

  it('escolher os horários e salvar chama salvarHorario com início e fim', async () => {
    const salvarHorario = jest.fn().mockResolvedValue(undefined);
    configurarHookPadrao({ salvarHorario });
    await render(<AppBlockConfigScreen uid="uid-1" aoVoltar={jest.fn()} />);

    await fireEvent.press(screen.getByText('Início'));
    await fireEvent.press(screen.getByTestId('datetimepicker-mock'));
    await fireEvent.press(screen.getByText('Fim'));
    await fireEvent.press(screen.getByTestId('datetimepicker-mock'));

    await fireEvent.press(screen.getByText('Salvar horário'));

    expect(salvarHorario).toHaveBeenCalledWith('09:00', '18:00');
  });

  it('mostra "Salvo" depois de salvar o horário', async () => {
    await render(<AppBlockConfigScreen uid="uid-1" aoVoltar={jest.fn()} />);

    expect(screen.queryByText('Salvo')).toBeNull();
    await fireEvent.press(screen.getByText('Salvar horário'));

    await waitFor(() => expect(screen.getByText('Salvo')).toBeTruthy());
  });

  it('sem apps instalados: mostra o estado vazio', async () => {
    configurarHookPadrao({ appsInstalados: [] });
    await render(<AppBlockConfigScreen uid="uid-1" aoVoltar={jest.fn()} />);

    expect(screen.getByTestId('empty-state')).toBeTruthy();
    expect(screen.getByText('Nenhum app encontrado')).toBeTruthy();
  });

  it('tem RefreshControl e o puxar-pra-atualizar aciona recarregar() do hook e reverifica a acessibilidade', async () => {
    const recarregar = jest.fn().mockResolvedValue(undefined);
    const verificarNovamente = jest.fn().mockResolvedValue(undefined);
    configurarHookPadrao({ recarregar });
    configurarAcessibilidade({ verificarNovamente });
    await render(<AppBlockConfigScreen uid="uid-1" aoVoltar={jest.fn()} />);

    const lista = screen.getByTestId('app-block-lista');
    expect(lista.props.refreshControl).toBeTruthy();

    await act(async () => {
      await lista.props.refreshControl.props.onRefresh();
    });

    expect(recarregar).toHaveBeenCalledTimes(1);
    expect(verificarNovamente).toHaveBeenCalledTimes(1);
  });

  describe('aviso de permissão de acessibilidade', () => {
    it('serviço desativado: mostra o aviso com o botão pra abrir Configurações', async () => {
      configurarAcessibilidade({ ativo: false, carregando: false });
      await render(<AppBlockConfigScreen uid="uid-1" aoVoltar={jest.fn()} />);

      expect(screen.getByTestId('app-block-aviso-acessibilidade')).toBeTruthy();
      expect(
        screen.getByText('Falta uma permissão pro bloqueio funcionar'),
      ).toBeTruthy();
      expect(screen.getByText('Ativar nas Configurações')).toBeTruthy();
    });

    it('serviço ativado: não mostra o aviso', async () => {
      configurarAcessibilidade({ ativo: true, carregando: false });
      await render(<AppBlockConfigScreen uid="uid-1" aoVoltar={jest.fn()} />);

      expect(
        screen.queryByTestId('app-block-aviso-acessibilidade'),
      ).toBeNull();
    });

    it('ainda carregando o status: não mostra o aviso (evita piscar antes de saber)', async () => {
      configurarAcessibilidade({ ativo: false, carregando: true });
      await render(<AppBlockConfigScreen uid="uid-1" aoVoltar={jest.fn()} />);

      expect(
        screen.queryByTestId('app-block-aviso-acessibilidade'),
      ).toBeNull();
    });

    it('tocar em "Ativar nas Configurações" chama abrirConfiguracoes', async () => {
      const abrirConfiguracoes = jest.fn();
      configurarAcessibilidade({
        ativo: false,
        carregando: false,
        abrirConfiguracoes,
      });
      await render(<AppBlockConfigScreen uid="uid-1" aoVoltar={jest.fn()} />);

      await fireEvent.press(screen.getByText('Ativar nas Configurações'));

      expect(abrirConfiguracoes).toHaveBeenCalledTimes(1);
    });
  });

  it('reflete appsSelecionados no estado de cada AppSelectorItem', async () => {
    configurarHookPadrao({
      configAtual: {
        ativo: false,
        appsSelecionados: ['com.whatsapp'],
        horarioInicio: null,
        horarioFim: null,
      },
    });
    await render(<AppBlockConfigScreen uid="uid-1" aoVoltar={jest.fn()} />);

    expect(
      screen.getByLabelText('WhatsApp').props.accessibilityState.checked,
    ).toBe(true);
    expect(
      screen.getByLabelText('Instagram').props.accessibilityState.checked,
    ).toBe(false);
  });
});
