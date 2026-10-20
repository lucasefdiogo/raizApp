import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { BloqueioAppsScreen } from './BloqueioAppsScreen';

jest.mock('../../hooks/useRegrasBloqueio');
jest.mock('../../hooks/useAccessibilityPermission');
jest.mock('../../hooks/useAcessoUso');

const { useRegrasBloqueio } = require('../../hooks/useRegrasBloqueio');
const { useAccessibilityPermission } = require('../../hooks/useAccessibilityPermission');
const { useAcessoUso } = require('../../hooks/useAcessoUso');

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
    useAcessoUso.mockReturnValue({ concedido: true, carregando: false });
  });

  it('CA-06: sem acesso de uso mostra a entrada "Medir tempo nas redes", que abre a divulgação', async () => {
    useAcessoUso.mockReturnValue({ concedido: false, carregando: false });
    const aoTocarMedirTempo = jest.fn();
    await render(
      <BloqueioAppsScreen
        uid="uid-1"
        aoTocarAtivar={jest.fn()}
        aoTocarSaibaOQueE={jest.fn()}
        aoTocarMedirTempo={aoTocarMedirTempo}
      />,
    );

    await fireEvent.press(screen.getByText('Medir tempo nas redes'));

    expect(aoTocarMedirTempo).toHaveBeenCalledTimes(1);
  });

  it('CA-06: com acesso de uso concedido não mostra a entrada "Medir tempo nas redes"', async () => {
    useAcessoUso.mockReturnValue({ concedido: true, carregando: false });
    await render(
      <BloqueioAppsScreen
        uid="uid-1"
        aoTocarAtivar={jest.fn()}
        aoTocarSaibaOQueE={jest.fn()}
        aoTocarMedirTempo={jest.fn()}
      />,
    );

    expect(screen.queryByText('Medir tempo nas redes')).toBeNull();
  });

  it('mostra o indicador de carregamento enquanto useRegrasBloqueio carrega', async () => {
    configurarRegrasPadrao({ carregando: true });
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  it('lista os apps instalados', async () => {
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} />);

    expect(screen.getByText('Instagram')).toBeTruthy();
    expect(screen.getByText('WhatsApp')).toBeTruthy();
  });

  it('busca filtra a lista por nome', async () => {
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} />);

    await fireEvent.changeText(screen.getByLabelText('Buscar'), 'insta');

    expect(screen.getByText('Instagram')).toBeTruthy();
    expect(screen.queryByText('WhatsApp')).toBeNull();
  });

  it('status "Desativado" mostra o botão Ativar, que chama aoTocarAtivar (leva à divulgação em destaque)', async () => {
    const aoTocarAtivar = jest.fn();
    configurarAcessibilidadePadrao({ ativo: false });
    await render(
      <BloqueioAppsScreen
        uid="uid-1"
        aoTocarAtivar={aoTocarAtivar}
        aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()}
      />,
    );

    expect(screen.getByText('Desativado')).toBeTruthy();
    await fireEvent.press(screen.getByText('Ativar'));

    expect(aoTocarAtivar).toHaveBeenCalledTimes(1);
  });

  it('status "Ativo" não mostra o botão Ativar', async () => {
    configurarAcessibilidadePadrao({ ativo: true });
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} />);

    expect(screen.getByText('Ativo')).toBeTruthy();
    expect(screen.queryByText('Ativar')).toBeNull();
  });

  it('aviso "Sem ele..." só aparece com o serviço desativado', async () => {
    configurarAcessibilidadePadrao({ ativo: false });
    const { rerender } = await render(
      <BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} />,
    );
    expect(
      screen.getByText('Sem ele, o Rootora não consegue interceptar os apps abaixo.'),
    ).toBeTruthy();

    configurarAcessibilidadePadrao({ ativo: true });
    await rerender(
      <BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} />,
    );
    expect(
      screen.queryByText('Sem ele, o Rootora não consegue interceptar os apps abaixo.'),
    ).toBeNull();
  });

  it('link "Saiba o que é" aparece com o serviço ativo e navega pra divulgação', async () => {
    const aoTocarSaibaOQueE = jest.fn();
    configurarAcessibilidadePadrao({ ativo: true });
    await render(
      <BloqueioAppsScreen
        uid="uid-1"
        aoTocarAtivar={jest.fn()}
        aoTocarSaibaOQueE={aoTocarSaibaOQueE}
        aoTocarMedirTempo={jest.fn()}
      />,
    );

    expect(screen.getByText('Saiba o que é')).toBeTruthy();
    await fireEvent.press(screen.getByText('Saiba o que é'));

    expect(aoTocarSaibaOQueE).toHaveBeenCalledTimes(1);
  });

  it('link "Saiba o que é" também aparece com o serviço desativado e navega pra divulgação', async () => {
    const aoTocarSaibaOQueE = jest.fn();
    configurarAcessibilidadePadrao({ ativo: false });
    await render(
      <BloqueioAppsScreen
        uid="uid-1"
        aoTocarAtivar={jest.fn()}
        aoTocarSaibaOQueE={aoTocarSaibaOQueE}
        aoTocarMedirTempo={jest.fn()}
      />,
    );

    expect(screen.getByText('Saiba o que é')).toBeTruthy();
    await fireEvent.press(screen.getByText('Saiba o que é'));

    expect(aoTocarSaibaOQueE).toHaveBeenCalledTimes(1);
  });

  it('sem pendência: não mostra o aviso de alteração pendente', async () => {
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} />);

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
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} />);

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
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} />);

    expect(screen.getByLabelText('Instagram').props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(screen.getByLabelText('WhatsApp').props.accessibilityState).toMatchObject({
      checked: false,
    });
  });

  it('toggle de um app marca/desmarca a seleção', async () => {
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} />);

    // Primeira configuração: a lista já vem pré-marcada (RN-03).
    expect(screen.getByLabelText('Instagram').props.accessibilityState).toMatchObject({
      checked: true,
    });

    await fireEvent.press(screen.getByLabelText('Instagram'));
    expect(screen.getByLabelText('Instagram').props.accessibilityState).toMatchObject({
      checked: false,
    });

    await fireEvent.press(screen.getByLabelText('Instagram'));
    expect(screen.getByLabelText('Instagram').props.accessibilityState).toMatchObject({
      checked: true,
    });
  });

  it('com app selecionado mas sem nenhum dia da semana: mostra o aviso e Salvar não faz nada', async () => {
    const salvar = jest.fn().mockResolvedValue(true);
    configurarRegrasPadrao({ salvar });
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} />);

    expect(
      screen.getByText('Escolha um horário de fim depois do início e pelo menos um dia da semana.'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByText('Salvar'));
    expect(salvar).not.toHaveBeenCalled();
  });

  it('selecionar um app + um dia da semana permite Salvar, chamado com apps e janela', async () => {
    const salvar = jest.fn().mockResolvedValue(true);
    configurarRegrasPadrao({ salvar });
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText('segunda'));
    await fireEvent.press(screen.getByText('Salvar'));

    await waitFor(() =>
      expect(salvar).toHaveBeenCalledWith(
        ['com.instagram.android', 'com.whatsapp'],
        expect.objectContaining({ diasSemana: [1] }),
      ),
    );
  });

  it('Salvar com a seleção vazia chama salvar(apps vazio, null)', async () => {
    const salvar = jest.fn().mockResolvedValue(true);
    configurarRegrasPadrao({ salvar });
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText('Instagram'));
    await fireEvent.press(screen.getByLabelText('WhatsApp'));
    await fireEvent.press(screen.getByText('Salvar'));

    expect(salvar).toHaveBeenCalledWith([], null);
  });

  describe('aviso de alteração pendente (já existe regrasVigentes — qualquer salvar vira pendente)', () => {
    const VIGENTE = {
      apps: ['com.instagram.android'],
      janelas: [{ inicio: '09:00', fim: '18:00', diasSemana: [1, 2, 3, 4, 5] }],
    };

    it('Salvar mostra o aviso em vez de gravar na hora, com o "antes" e o "depois" (cenário do usuário: desmarcar um app)', async () => {
      const salvar = jest.fn().mockResolvedValue(true);
      configurarRegrasPadrao({ salvar, regrasVigentes: VIGENTE });
      await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} />);

      await fireEvent.press(screen.getByLabelText('Instagram'));
      await fireEvent.press(screen.getByText('Salvar'));

      expect(salvar).not.toHaveBeenCalled();
      expect(screen.getByText('A mudança vale a partir de amanhã')).toBeTruthy();
      expect(
        screen.getByText('1 app selecionado, seg, ter, qua, qui, sex das 09:00 às 18:00.'),
      ).toBeTruthy();
      expect(screen.getByText('Nenhum app bloqueado.')).toBeTruthy();
    });

    it('"Entendi, confirmar" grava de fato e volta pra edição', async () => {
      const salvar = jest.fn().mockResolvedValue(true);
      configurarRegrasPadrao({ salvar, regrasVigentes: VIGENTE });
      await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} />);

      await fireEvent.press(screen.getByText('Salvar'));
      await fireEvent.press(screen.getByText('Entendi, confirmar'));

      expect(salvar).toHaveBeenCalledWith(VIGENTE.apps, expect.objectContaining(VIGENTE.janelas[0]));
      expect(screen.queryByText('A mudança vale a partir de amanhã')).toBeNull();
      expect(screen.getByText('Bloqueio de apps')).toBeTruthy();
    });

    it('"Voltar e revisar" volta pra edição sem chamar salvar', async () => {
      const salvar = jest.fn().mockResolvedValue(true);
      configurarRegrasPadrao({ salvar, regrasVigentes: VIGENTE });
      await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} />);

      await fireEvent.press(screen.getByText('Salvar'));
      await fireEvent.press(screen.getByText('Voltar e revisar'));

      expect(salvar).not.toHaveBeenCalled();
      expect(screen.queryByText('A mudança vale a partir de amanhã')).toBeNull();
      expect(screen.getByText('Bloqueio de apps')).toBeTruthy();
    });

    it('primeira configuração (sem regrasVigentes ainda) não mostra o aviso', async () => {
      const salvar = jest.fn().mockResolvedValue(true);
      configurarRegrasPadrao({ salvar, regrasVigentes: undefined });
      await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} />);

      await fireEvent.press(screen.getByLabelText('Instagram'));
      await fireEvent.press(screen.getByLabelText('segunda'));
      await fireEvent.press(screen.getByText('Salvar'));

      await waitFor(() => expect(salvar).toHaveBeenCalled());
      expect(screen.queryByText('A mudança vale a partir de amanhã')).toBeNull();
    });
  });
  describe('lista curada de redes sociais (HU-01)', () => {
    const REDES = [
      { packageName: 'com.instagram.android', nome: 'Instagram', iconeBase64: 'a' },
      { packageName: 'com.zhiliaoapp.musically', nome: 'TikTok', iconeBase64: 'b' },
      { packageName: 'com.google.android.youtube', nome: 'YouTube', iconeBase64: 'c' },
    ];
    const DICA_YOUTUBE = 'Usa para estudar? Pode deixar livre.';

    async function renderizar() {
      await render(
        <BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} />,
      );
    }

    it('CA-01: primeira configuração marca Instagram e TikTok, deixa o YouTube desmarcado e mostra a dica', async () => {
      configurarRegrasPadrao({ appsInstalados: REDES, regrasVigentes: undefined });

      await renderizar();

      expect(screen.getByRole('checkbox', { name: 'Instagram', checked: true })).toBeTruthy();
      expect(screen.getByRole('checkbox', { name: 'TikTok', checked: true })).toBeTruthy();
      expect(screen.getByRole('checkbox', { name: 'YouTube', checked: false })).toBeTruthy();
      expect(screen.getByText(DICA_YOUTUBE)).toBeTruthy();
      expect(screen.getByLabelText('YouTube').props.accessibilityHint).toBe(DICA_YOUTUBE);
    });

    it('CA-01: a dica do YouTube aparece também com o YouTube marcado, e só nele', async () => {
      configurarRegrasPadrao({
        appsInstalados: REDES,
        regrasVigentes: { apps: ['com.google.android.youtube'], janelas: [] },
      });

      await renderizar();

      expect(screen.getByRole('checkbox', { name: 'YouTube', checked: true })).toBeTruthy();
      expect(screen.getAllByText(DICA_YOUTUBE)).toHaveLength(1);
    });

    it('CA-03: com regra salva mostra exatamente as marcações salvas, sem pré-marcação', async () => {
      configurarRegrasPadrao({
        appsInstalados: REDES,
        regrasVigentes: {
          apps: ['com.google.android.youtube'],
          janelas: [{ inicio: '09:00', fim: '18:00', diasSemana: [1] }],
        },
      });

      await renderizar();

      expect(screen.getByRole('checkbox', { name: 'Instagram', checked: false })).toBeTruthy();
      expect(screen.getByRole('checkbox', { name: 'TikTok', checked: false })).toBeTruthy();
      expect(screen.getByRole('checkbox', { name: 'YouTube', checked: true })).toBeTruthy();
    });

    it('CA-04: sem nenhuma rede social instalada mostra o estado vazio e nenhum item de app', async () => {
      configurarRegrasPadrao({ appsInstalados: [] });

      await renderizar();

      expect(screen.getByText('Nenhuma rede social encontrada neste aparelho.')).toBeTruthy();
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
      expect(screen.queryByLabelText('Buscar')).toBeNull();
      expect(screen.queryByText('Salvar')).toBeNull();
    });

    it('CA-04: com redes instaladas não mostra o estado vazio', async () => {
      configurarRegrasPadrao({ appsInstalados: REDES });

      await renderizar();

      expect(screen.queryByText('Nenhuma rede social encontrada neste aparelho.')).toBeNull();
    });
  });
});
