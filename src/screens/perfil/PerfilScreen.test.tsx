import React from 'react';
import { Linking, StyleSheet } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PerfilScreen } from './PerfilScreen';
import {
  URL_POLITICA_PRIVACIDADE,
  URL_TERMOS_DE_USO,
} from '../../config/legalLinks';

jest.mock('../../hooks/usePerfil');
jest.mock('../../hooks/useAuth');
jest.mock('../../hooks/useAccountDeletion');
jest.mock('../../hooks/useVoltarParaAbaHoje');

const { usePerfil } = require('../../hooks/usePerfil');
const { useAuth } = require('../../hooks/useAuth');
const { useAccountDeletion } = require('../../hooks/useAccountDeletion');

function configurarPerfilPadrao(sobrescritas = {}) {
  usePerfil.mockReturnValue({
    porqueTexto: 'Terminar meus estudos',
    notificacoesAtivas: false,
    horarioLembreteDiario: null,
    carregando: false,
    salvarPorque: jest.fn().mockResolvedValue(true),
    alternarNotificacoes: jest.fn().mockResolvedValue(undefined),
    alterarHorario: jest.fn().mockResolvedValue(undefined),
    ...sobrescritas,
  });
}

function configurarExclusaoPadrao(sobrescritas = {}) {
  useAccountDeletion.mockReturnValue({
    excluirConta: jest.fn().mockResolvedValue(undefined),
    precisaReautenticar: false,
    provedor: null,
    reautenticar: jest.fn().mockResolvedValue(undefined),
    cancelarReautenticacao: jest.fn(),
    carregando: false,
    erro: null,
    ...sobrescritas,
  });
}

describe('PerfilScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    configurarPerfilPadrao();
    configurarExclusaoPadrao();
    useAuth.mockReturnValue({
      user: { uid: 'uid-teste' },
      carregando: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
    });
  });

  it('mostra o porquê atual carregado de usePerfil', async () => {
    await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);

    expect(screen.getByDisplayValue('Terminar meus estudos')).toBeTruthy();
  });

  it('o campo do porquê é multilinha e alto (mesmo padrão do onboarding)', async () => {
    await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);

    const campo = screen.getByLabelText('Por que você quer estar aqui');
    const estilo = StyleSheet.flatten(campo.props.style) ?? {};
    expect(campo.props.multiline).toBe(true);
    expect(estilo.minHeight).toBe(120);
  });

  it('o botão Salvar não fica dentro de um container flex-row (que o encolheria)', async () => {
    await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);

    // sobe do texto até o conteúdo da tela conferindo que nenhum ancestral
    // próximo é flex-row — foi isso que colapsava o botão pra ~130px.
    let node = screen.getByText('Salvar').parent;
    for (let i = 0; i < 5 && node; i += 1) {
      const estilo = StyleSheet.flatten(node.props?.style) ?? {};
      expect(estilo.flexDirection).not.toBe('row');
      node = node.parent;
    }
  });

  it('botão Salvar chama salvarPorque só ao tocar, com o texto atual — não a cada tecla', async () => {
    const salvarPorque = jest.fn().mockResolvedValue(undefined);
    configurarPerfilPadrao({ salvarPorque });

    await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);

    await fireEvent.changeText(
      screen.getByDisplayValue('Terminar meus estudos'),
      'Terminar meus estudos sem culpa',
    );
    expect(salvarPorque).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Salvar'));

    expect(salvarPorque).toHaveBeenCalledTimes(1);
    expect(salvarPorque).toHaveBeenCalledWith('Terminar meus estudos sem culpa');
  });

  it('mostra "Salvo" depois de salvar o porquê', async () => {
    await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);

    expect(screen.queryByText('Salvo')).toBeNull();

    await fireEvent.press(screen.getByText('Salvar'));

    await waitFor(() => expect(screen.getByText('Salvo')).toBeTruthy());
  });

  it('não mostra "Salvo" quando salvarPorque falha (o toast fica a cargo do hook)', async () => {
    configurarPerfilPadrao({
      salvarPorque: jest.fn().mockResolvedValue(false),
    });

    await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);
    await fireEvent.press(screen.getByText('Salvar'));

    await waitFor(() => expect(screen.getByText('Salvar')).toBeTruthy());
    expect(screen.queryByText('Salvo')).toBeNull();
  });

  it('seletor de horário não aparece com notificações desativadas', async () => {
    await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);

    expect(screen.queryByText('Alterar horário')).toBeNull();
    expect(screen.queryByTestId('datetimepicker-mock')).toBeNull();
  });

  it('seletor de horário aparece só depois de ativar as notificações e tocar em Alterar horário', async () => {
    configurarPerfilPadrao({
      notificacoesAtivas: true,
      horarioLembreteDiario: '08:00',
    });

    await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);

    expect(screen.getByText('Horário: 08:00')).toBeTruthy();
    expect(screen.queryByTestId('datetimepicker-mock')).toBeNull();

    await fireEvent.press(screen.getByText('Alterar horário'));

    expect(screen.getByTestId('datetimepicker-mock')).toBeTruthy();
  });

  it('escolher um horário no seletor chama alterarHorario e fecha o seletor', async () => {
    const alterarHorario = jest.fn().mockResolvedValue(undefined);
    configurarPerfilPadrao({
      notificacoesAtivas: true,
      horarioLembreteDiario: '08:00',
      alterarHorario,
    });

    await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);
    await fireEvent.press(screen.getByText('Alterar horário'));
    await fireEvent.press(screen.getByTestId('datetimepicker-mock'));

    expect(alterarHorario).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('datetimepicker-mock')).toBeNull();
  });

  it('toggle de notificações chama alternarNotificacoes com o novo valor', async () => {
    const alternarNotificacoes = jest.fn().mockResolvedValue(undefined);
    configurarPerfilPadrao({ alternarNotificacoes });

    await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);
    await fireEvent(screen.getByRole('switch'), 'valueChange', true);

    expect(alternarNotificacoes).toHaveBeenCalledWith(true);
  });

  it('botão Sair chama signOut', async () => {
    const signOut = jest.fn();
    useAuth.mockReturnValue({
      user: { uid: 'uid-teste' },
      carregando: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      signOut,
      resetPassword: jest.fn(),
    });

    await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  describe('links legais', () => {
    beforeEach(() => {
      jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    });

    it('mostra a seção "Sobre" com os dois links legais', async () => {
      await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);

      expect(screen.getByText('Sobre')).toBeTruthy();
      expect(screen.getByText('Política de Privacidade')).toBeTruthy();
      expect(screen.getByText('Termos de Uso')).toBeTruthy();
    });

    it('tocar em "Política de Privacidade" abre a URL da política', async () => {
      await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);

      await fireEvent.press(screen.getByText('Política de Privacidade'));

      expect(Linking.openURL).toHaveBeenCalledWith(URL_POLITICA_PRIVACIDADE);
    });

    it('tocar em "Termos de Uso" abre a URL dos termos', async () => {
      await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);

      await fireEvent.press(screen.getByText('Termos de Uso'));

      expect(Linking.openURL).toHaveBeenCalledWith(URL_TERMOS_DE_USO);
    });
  });

  it('mostra o LoadingIndicator enquanto usePerfil carrega e o formulário só depois', async () => {
    configurarPerfilPadrao({ carregando: true });

    const { rerender } = await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(screen.queryByText('Seu porquê')).toBeNull();
    expect(screen.queryByDisplayValue('Terminar meus estudos')).toBeNull();

    configurarPerfilPadrao({ carregando: false });
    rerender(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);

    await waitFor(() =>
      expect(screen.getByDisplayValue('Terminar meus estudos')).toBeTruthy(),
    );
    expect(screen.queryByTestId('loading-indicator')).toBeNull();
  });

  describe('exclusão de conta', () => {
    it('mostra o botão "Excluir conta" e o modal só abre ao tocar nele', async () => {
      await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);

      expect(screen.getByText('Excluir conta')).toBeTruthy();
      expect(screen.queryByText('Excluir sua conta')).toBeNull();

      await fireEvent.press(screen.getByText('Excluir conta'));

      expect(screen.getByText('Excluir sua conta')).toBeTruthy();
    });

    it('confirmar no modal chama excluirConta do hook', async () => {
      const excluirConta = jest.fn().mockResolvedValue(undefined);
      configurarExclusaoPadrao({ excluirConta });

      await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);
      await fireEvent.press(screen.getByText('Excluir conta'));
      // botão "Excluir conta" dentro do modal (2ª confirmação)
      await fireEvent.press(screen.getAllByText('Excluir conta')[1]);

      expect(excluirConta).toHaveBeenCalledTimes(1);
    });

    it('cancelar no modal fecha sem chamar excluirConta', async () => {
      const excluirConta = jest.fn().mockResolvedValue(undefined);
      configurarExclusaoPadrao({ excluirConta });

      await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);
      await fireEvent.press(screen.getByText('Excluir conta'));
      await fireEvent.press(screen.getByText('Cancelar'));

      expect(excluirConta).not.toHaveBeenCalled();
      expect(screen.queryByText('Excluir sua conta')).toBeNull();
    });

    it('mostra o LoadingIndicator fullscreen durante a exclusão (fora do fluxo de reautenticação)', async () => {
      configurarExclusaoPadrao({ carregando: true, precisaReautenticar: false });

      await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);

      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
      expect(screen.queryByText('Seu porquê')).toBeNull();
    });

    it('mostra o ReauthPromptModal quando o hook pede reautenticação, com a tela ainda montada', async () => {
      configurarExclusaoPadrao({
        precisaReautenticar: true,
        provedor: 'password',
        carregando: false,
      });

      await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);

      expect(screen.getByText('Confirme que é você')).toBeTruthy();
      expect(screen.getByText('Seu porquê')).toBeTruthy();
    });

    it('enviar a senha no ReauthPromptModal chama reautenticar do hook', async () => {
      const reautenticar = jest.fn().mockResolvedValue(undefined);
      configurarExclusaoPadrao({
        precisaReautenticar: true,
        provedor: 'password',
        reautenticar,
      });

      await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);

      await fireEvent.changeText(screen.getByLabelText('Senha'), 'minhaSenha');
      await fireEvent.press(screen.getByText('Confirmar e excluir'));

      expect(reautenticar).toHaveBeenCalledWith('minhaSenha');
    });
  });

  describe('entrada de "Bloqueio de apps"', () => {
    it('mostra a seção e chama aoAbrirBloqueioApps ao tocar', async () => {
      const aoAbrir = jest.fn();
      await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={aoAbrir} />);

      expect(screen.getByText('Bloqueio de apps')).toBeTruthy();
      await fireEvent.press(screen.getByText('Configurar bloqueio de apps'));

      expect(aoAbrir).toHaveBeenCalledTimes(1);
    });
  });

  describe('botão de debug (dev)', () => {
    it('não aparece quando aoAbrirDebugAcessibilidade não é passado', async () => {
      await render(<PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} />);
      expect(screen.queryByText('🔧 Debug: detecção de apps')).toBeNull();
    });

    it('aparece e chama o handler ao tocar quando o prop é passado', async () => {
      const aoAbrir = jest.fn();
      await render(
        <PerfilScreen uid="uid-teste" aoAbrirBloqueioApps={jest.fn()} aoAbrirDebugAcessibilidade={aoAbrir} />,
      );

      await fireEvent.press(screen.getByText('🔧 Debug: detecção de apps'));

      expect(aoAbrir).toHaveBeenCalledTimes(1);
    });
  });
});
