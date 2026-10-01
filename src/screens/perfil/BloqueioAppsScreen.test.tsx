import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { BloqueioAppsScreen } from './BloqueioAppsScreen';

jest.mock('../../hooks/useRegrasBloqueio');
jest.mock('../../hooks/useAccessibilityPermission');

const { useRegrasBloqueio } = require('../../hooks/useRegrasBloqueio');
const { useAccessibilityPermission } = require('../../hooks/useAccessibilityPermission');

const APPS_INSTALADOS = [
  { packageName: 'com.instagram.android', nome: 'Instagram', iconeBase64: 'a' },
  { packageName: 'com.whatsapp', nome: 'WhatsApp', iconeBase64: 'b' },
];

function configurarRegrasPadrao(sobrescritas = {}) {
  useRegrasBloqueio.mockReturnValue({
    carregando: false,
    appsInstalados: APPS_INSTALADOS,
    regrasVigentes: undefined,
    regrasPendentes: null,
    salvar: jest.fn().mockResolvedValue(true),
    cancelarAlteracaoPendente: jest.fn().mockResolvedValue(undefined),
    ...sobrescritas,
  });
}

function configurarAcessibilidadePadrao(sobrescritas = {}) {
  useAccessibilityPermission.mockReturnValue({
    ativo: false,
    carregando: false,
    verificarNovamente: jest.fn(),
    ...sobrescritas,
  });
}

describe('BloqueioAppsScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    configurarRegrasPadrao();
    configurarAcessibilidadePadrao();
  });

  it('mostra o indicador de carregamento enquanto useRegrasBloqueio carrega', async () => {
    configurarRegrasPadrao({ carregando: true });
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  it('lista os apps instalados', async () => {
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} />);

    expect(screen.getByText('Instagram')).toBeTruthy();
    expect(screen.getByText('WhatsApp')).toBeTruthy();
  });

  it('busca filtra a lista por nome', async () => {
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} />);

    await fireEvent.changeText(screen.getByLabelText('Buscar'), 'insta');

    expect(screen.getByText('Instagram')).toBeTruthy();
    expect(screen.queryByText('WhatsApp')).toBeNull();
  });

  it('status "Desativado" mostra o botão Ativar, que chama aoTocarAtivar (leva à divulgação em destaque)', async () => {
    const aoTocarAtivar = jest.fn();
    configurarAcessibilidadePadrao({ ativo: false });
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={aoTocarAtivar} />);

    expect(screen.getByText('Desativado')).toBeTruthy();
    await fireEvent.press(screen.getByText('Ativar'));

    expect(aoTocarAtivar).toHaveBeenCalledTimes(1);
  });

  it('status "Ativo" não mostra o botão Ativar', async () => {
    configurarAcessibilidadePadrao({ ativo: true });
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} />);

    expect(screen.getByText('Ativo')).toBeTruthy();
    expect(screen.queryByText('Ativar')).toBeNull();
  });

  it('sem pendência: não mostra o aviso de alteração pendente', async () => {
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} />);

    expect(screen.queryByText('Cancelar alteração')).toBeNull();
  });

  it('com pendência: mostra o resumo e "Cancelar alteração" apaga a pendência', async () => {
    const cancelarAlteracaoPendente = jest.fn().mockResolvedValue(undefined);
    configurarRegrasPadrao({
      regrasVigentes: { apps: ['com.whatsapp'], janelas: [] },
      regrasPendentes: {
        apps: ['com.instagram.android'],
        janelas: [{ inicio: '09:00', fim: '18:00', diasSemana: [1, 2, 3, 4, 5] }],
        efetivaEm: '2026-09-25',
      },
      cancelarAlteracaoPendente,
    });
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} />);

    expect(
      screen.getByText(
        'Nova regra começa amanhã: 1 app selecionado, seg, ter, qua, qui, sex das 09:00 às 18:00.',
      ),
    ).toBeTruthy();

    await fireEvent.press(screen.getByText('Cancelar alteração'));
    expect(cancelarAlteracaoPendente).toHaveBeenCalledTimes(1);
  });

  it('inicializa a seleção a partir da regra PENDENTE quando existe uma (não da vigente)', async () => {
    configurarRegrasPadrao({
      regrasVigentes: { apps: ['com.whatsapp'], janelas: [] },
      regrasPendentes: {
        apps: ['com.instagram.android'],
        janelas: [{ inicio: '09:00', fim: '18:00', diasSemana: [1] }],
        efetivaEm: '2026-09-25',
      },
    });
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} />);

    expect(screen.getByLabelText('Instagram').props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(screen.getByLabelText('WhatsApp').props.accessibilityState).toMatchObject({
      checked: false,
    });
  });

  it('toggle de um app marca/desmarca a seleção', async () => {
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText('Instagram'));
    expect(screen.getByLabelText('Instagram').props.accessibilityState).toMatchObject({
      checked: true,
    });

    await fireEvent.press(screen.getByLabelText('Instagram'));
    expect(screen.getByLabelText('Instagram').props.accessibilityState).toMatchObject({
      checked: false,
    });
  });

  it('com app selecionado mas sem nenhum dia da semana: mostra o aviso e Salvar não faz nada', async () => {
    const salvar = jest.fn().mockResolvedValue(true);
    configurarRegrasPadrao({ salvar });
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText('Instagram'));

    expect(
      screen.getByText('Escolha um horário de fim depois do início e pelo menos um dia da semana.'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByText('Salvar'));
    expect(salvar).not.toHaveBeenCalled();
  });

  it('selecionar um app + um dia da semana permite Salvar, chamado com apps e janela', async () => {
    const salvar = jest.fn().mockResolvedValue(true);
    configurarRegrasPadrao({ salvar });
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText('Instagram'));
    await fireEvent.press(screen.getByLabelText('segunda'));
    await fireEvent.press(screen.getByText('Salvar'));

    await waitFor(() =>
      expect(salvar).toHaveBeenCalledWith(
        ['com.instagram.android'],
        expect.objectContaining({ diasSemana: [1] }),
      ),
    );
  });

  it('Salvar com a seleção vazia chama salvar(apps vazio, null)', async () => {
    const salvar = jest.fn().mockResolvedValue(true);
    configurarRegrasPadrao({ salvar });
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} />);

    await fireEvent.press(screen.getByText('Salvar'));

    expect(salvar).toHaveBeenCalledWith([], null);
  });
});
