import React from 'react';
import { render as rtlRender, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BloqueioAppsScreen } from './BloqueioAppsScreen';

// A tela sempre monta a SessoesInfoSheet (que lê useSafeAreaInsets), mesmo
// invisível — mesmo padrão de ReflexaoSemanalSheet.test.tsx. `rerender`
// precisa do mesmo wrapper: ele substitui a árvore inteira, não só os filhos.
function comSafeArea(ui: React.ReactElement) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 320, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      {ui}
    </SafeAreaProvider>
  );
}

// render/rerender são assíncronos nesta versão do RNTL — esquecer o await
// aqui faz `resultado` virar a Promise em vez do objeto de queries.
async function render(ui: React.ReactElement) {
  const resultado = await rtlRender(comSafeArea(ui));
  return {
    ...resultado,
    rerender: (novaUi: React.ReactElement) => resultado.rerender(comSafeArea(novaUi)),
  };
}

jest.mock('../../hooks/useRegrasBloqueio');
jest.mock('../../hooks/useAccessibilityPermission');
jest.mock('../../hooks/useAcessoUso');
jest.mock('../../hooks/useRotina');
jest.mock('../../hooks/useToast');
jest.mock('../../hooks/useVoltarFisico');

const { useRegrasBloqueio } = require('../../hooks/useRegrasBloqueio');
const { useAccessibilityPermission } = require('../../hooks/useAccessibilityPermission');
const { useAcessoUso } = require('../../hooks/useAcessoUso');
const { useRotina } = require('../../hooks/useRotina');
const { useToast } = require('../../hooks/useToast');
const { useVoltarFisico } = require('../../hooks/useVoltarFisico');

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
    useRotina.mockReturnValue({ carregando: false, rotina: null, diasComDados: 0 });
    useToast.mockReturnValue({ showToast: jest.fn() });
  });

  it('CA-06: sem acesso de uso mostra a entrada "Medir tempo nas redes", que abre a divulgação', async () => {
    useAcessoUso.mockReturnValue({ concedido: false, carregando: false });
    const aoTocarMedirTempo = jest.fn();
    await render(
      <BloqueioAppsScreen
        uid="uid-1"
        aoTocarAtivar={jest.fn()}
        aoTocarSaibaOQueE={jest.fn()}
        aoTocarMedirTempo={aoTocarMedirTempo} onVoltar={jest.fn()}
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
        aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()}
      />,
    );

    expect(screen.queryByText('Medir tempo nas redes')).toBeNull();
  });

  it('mostra o indicador de carregamento enquanto useRegrasBloqueio carrega', async () => {
    configurarRegrasPadrao({ carregando: true });
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />);

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  it('lista os apps instalados', async () => {
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />);

    expect(screen.getByText('Instagram')).toBeTruthy();
    expect(screen.getByText('WhatsApp')).toBeTruthy();
  });

  it('busca filtra a lista por nome', async () => {
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />);

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
        aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()}
      />,
    );

    expect(screen.getByText('DESATIVADO')).toBeTruthy();
    await fireEvent.press(screen.getByText('Ativar'));

    expect(aoTocarAtivar).toHaveBeenCalledTimes(1);
  });

  it('HU-09 Cenário 2: status "Ativo" mostra o selo ATIVO e não mostra o botão Ativar', async () => {
    configurarAcessibilidadePadrao({ ativo: true });
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />);

    expect(screen.getByText('ATIVO')).toBeTruthy();
    expect(screen.queryByText('Ativar')).toBeNull();
  });

  it('HU-09 Cenário 3: status desativado mostra o selo DESATIVADO, o aviso e "Ativar"', async () => {
    configurarAcessibilidadePadrao({ ativo: false });
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />);

    expect(screen.getByText('DESATIVADO')).toBeTruthy();
    expect(
      screen.getByText('Sem ele, o Rootora não consegue interceptar os apps abaixo.'),
    ).toBeTruthy();
    expect(screen.getByText('Ativar')).toBeTruthy();
    expect(screen.getByText('Saiba o que é')).toBeTruthy();
  });

  it('aviso "Sem ele..." só aparece com o serviço desativado', async () => {
    configurarAcessibilidadePadrao({ ativo: false });
    const { rerender } = await render(
      <BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />,
    );
    expect(
      screen.getByText('Sem ele, o Rootora não consegue interceptar os apps abaixo.'),
    ).toBeTruthy();

    configurarAcessibilidadePadrao({ ativo: true });
    await rerender(
      <BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />,
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
        aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()}
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
        aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()}
      />,
    );

    expect(screen.getByText('Saiba o que é')).toBeTruthy();
    await fireEvent.press(screen.getByText('Saiba o que é'));

    expect(aoTocarSaibaOQueE).toHaveBeenCalledTimes(1);
  });

  it('sem pendência: não mostra o aviso de alteração pendente', async () => {
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />);

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
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />);

    expect(screen.getByText('VALE A PARTIR DE AMANHÃ')).toBeTruthy();
    expect(screen.getByText('1 app · seg a sex · 09:00–18:00')).toBeTruthy();

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
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />);

    expect(screen.getByLabelText('Instagram').props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(screen.getByLabelText('WhatsApp').props.accessibilityState).toMatchObject({
      checked: false,
    });
  });

  it('toggle de um app marca/desmarca a seleção', async () => {
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />);

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
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />);

    expect(
      screen.getByText('Escolha um horário de fim depois do início e pelo menos um dia da semana.'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByText('Salvar'));
    expect(salvar).not.toHaveBeenCalled();
  });

  it('selecionar um app + um dia da semana permite Salvar, chamado com apps e janela', async () => {
    const salvar = jest.fn().mockResolvedValue(true);
    configurarRegrasPadrao({ salvar });
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />);

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
    await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText('Instagram'));
    await fireEvent.press(screen.getByLabelText('WhatsApp'));
    await fireEvent.press(screen.getByText('Salvar'));

    expect(salvar).toHaveBeenCalledWith([], null);
  });

  describe('HU-09 · seções Sessões e Rotina noturna', () => {
    const VIGENTE_COM_JANELA = {
      apps: ['com.instagram.android'],
      janelas: [{ inicio: '09:00', fim: '18:00', diasSemana: [1, 2, 3, 4, 5] }],
    };

    it('Cenário 1: mostra as seções nesta ordem: status, QUANDO, APPS, SESSÕES, ROTINA NOTURNA e o resumo com Salvar', async () => {
      configurarRegrasPadrao({ regrasVigentes: VIGENTE_COM_JANELA });
      configurarAcessibilidadePadrao({ ativo: true });
      const { toJSON } = await render(
        <BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />,
      );

      expect(screen.getByText('ATIVO')).toBeTruthy();
      expect(screen.getByText('Salvar')).toBeTruthy();

      // Percorre só `children` (nunca `props`, onde mora a referência
      // circular do Provider do SafeAreaContext) pra coletar o texto
      // renderizado em ordem — mais simples e estável do que percorrer a
      // árvore de fibers do RNTL.
      function coletarTextos(node: unknown, saida: string[] = []): string[] {
        if (typeof node === 'string') {
          saida.push(node);
        } else if (Array.isArray(node)) {
          node.forEach(filho => coletarTextos(filho, saida));
        } else if (node && typeof node === 'object' && 'children' in node) {
          coletarTextos((node as { children: unknown }).children, saida);
        }
        return saida;
      }
      const textos = coletarTextos(toJSON());
      const indiceDe = (alvo: string) => textos.indexOf(alvo);
      expect(indiceDe('QUANDO')).toBeGreaterThanOrEqual(0);
      expect(indiceDe('APPS')).toBeGreaterThan(indiceDe('QUANDO'));
      expect(indiceDe('SESSÕES')).toBeGreaterThan(indiceDe('APPS'));
      expect(indiceDe('ROTINA NOTURNA')).toBeGreaterThan(indiceDe('SESSÕES'));
    });

    it('Cenário 5: Sessões com os valores padrão, sem campo de edição', async () => {
      configurarRegrasPadrao({ regrasVigentes: VIGENTE_COM_JANELA });
      await render(
        <BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />,
      );

      expect(screen.getByText('15 min')).toBeTruthy();
      expect(screen.getByText('45 min')).toBeTruthy();
      expect(screen.getByText('3x')).toBeTruthy();
      expect(screen.queryByText(/Até \d+ sessões por dia\./)).toBeNull();
    });

    it('RN05: com blocosDiarios numérico, mostra "Até {n} sessões por dia."', async () => {
      configurarRegrasPadrao({
        regrasVigentes: { ...VIGENTE_COM_JANELA, blocosDiarios: 4 },
      });
      await render(
        <BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />,
      );

      expect(screen.getByText('Até 4 sessões por dia.')).toBeTruthy();
    });

    it('Cenário 6: "Como funciona" abre a sheet e "Entendi" fecha', async () => {
      configurarRegrasPadrao({ regrasVigentes: VIGENTE_COM_JANELA });
      await render(
        <BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />,
      );

      await fireEvent.press(screen.getByText('Como funciona'));

      expect(
        screen.getByText(
          'Antes de cada sessão, uma pausa curta pergunta o que você vai fazer. Cada sessão dá 15 minutos de uso, contados só com a rede aberta. Depois vem uma pausa de 45 minutos. Durante a pausa, o acesso rápido libera 2 minutos, até 3 vezes por dia.',
        ),
      ).toBeTruthy();

      await fireEvent.press(screen.getByText('Entendi'));

      expect(screen.queryByText('Entendi')).toBeNull();
    });

    it('Cenário 7: rotina ainda aprendendo mostra o progresso', async () => {
      configurarRegrasPadrao({ regrasVigentes: VIGENTE_COM_JANELA });
      useRotina.mockReturnValue({ carregando: false, rotina: null, diasComDados: 3 });
      await render(
        <BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />,
      );

      expect(screen.getByText('Aprendendo seu horário · 3 de 5 dias')).toBeTruthy();
    });

    it('Cenário 8: rotina confirmada mostra o resumo longo, a pausa maior e "Editar" leva à Rotina noturna', async () => {
      configurarRegrasPadrao({ regrasVigentes: VIGENTE_COM_JANELA });
      useRotina.mockReturnValue({
        carregando: false,
        rotina: { dormirEstimado: '23:30', acordarEstimado: '07:00', confirmadoEm: '2026-10-15' },
        diasComDados: 14,
      });
      const aoAbrirRotina = jest.fn();
      await render(
        <BloqueioAppsScreen
          uid="uid-1"
          aoTocarAtivar={jest.fn()}
          aoTocarSaibaOQueE={jest.fn()}
          aoTocarMedirTempo={jest.fn()}
          onVoltar={jest.fn()}
          aoAbrirRotina={aoAbrirRotina}
        />,
      );

      expect(screen.getByText('Dormir 23:30 · Acordar 07:00')).toBeTruthy();
      expect(screen.getByText('Pausa maior entre 23:00 e 07:00')).toBeTruthy();

      await fireEvent.press(screen.getByText('Editar'));

      expect(aoAbrirRotina).toHaveBeenCalledTimes(1);
    });
  });

  describe('aviso de alteração pendente (já existe regrasVigentes — qualquer salvar vira pendente)', () => {
    const VIGENTE = {
      apps: ['com.instagram.android'],
      janelas: [{ inicio: '09:00', fim: '18:00', diasSemana: [1, 2, 3, 4, 5] }],
    };

    it('Salvar mostra o aviso em vez de gravar na hora, com o "antes" e o "depois" (cenário do usuário: desmarcar um app)', async () => {
      const salvar = jest.fn().mockResolvedValue(true);
      configurarRegrasPadrao({ salvar, regrasVigentes: VIGENTE });
      await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />);

      await fireEvent.press(screen.getByLabelText('Instagram'));
      await fireEvent.press(screen.getByText('Salvar'));

      expect(salvar).not.toHaveBeenCalled();
      expect(screen.getByText('Antes de salvar')).toBeTruthy();
      expect(screen.getByText('1 app · seg a sex · 09:00–18:00')).toBeTruthy();
      expect(screen.getByText('Nenhum app bloqueado.')).toBeTruthy();
      expect(
        screen.getByText(
          'Precisa parar agora? Dá para desligar o serviço nas configurações de acessibilidade do Android, a qualquer momento.',
        ),
      ).toBeTruthy();
    });

    it('"Entendi, confirmar" grava de fato e volta pra edição', async () => {
      const salvar = jest.fn().mockResolvedValue(true);
      configurarRegrasPadrao({ salvar, regrasVigentes: VIGENTE });
      await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />);

      await fireEvent.press(screen.getByText('Salvar'));
      await fireEvent.press(screen.getByText('Entendi, confirmar'));

      expect(salvar).toHaveBeenCalledWith(VIGENTE.apps, expect.objectContaining(VIGENTE.janelas[0]));
      expect(screen.queryByText('Antes de salvar')).toBeNull();
      expect(screen.getByText('Bloqueio de apps')).toBeTruthy();
    });

    it('"Voltar e revisar" volta pra edição sem chamar salvar', async () => {
      const salvar = jest.fn().mockResolvedValue(true);
      configurarRegrasPadrao({ salvar, regrasVigentes: VIGENTE });
      await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />);

      await fireEvent.press(screen.getByText('Salvar'));
      await fireEvent.press(screen.getByText('Voltar e revisar'));

      expect(salvar).not.toHaveBeenCalled();
      expect(screen.queryByText('Antes de salvar')).toBeNull();
      expect(screen.getByText('Bloqueio de apps')).toBeTruthy();
    });

    it('primeira configuração (sem regrasVigentes ainda) não mostra o aviso', async () => {
      const salvar = jest.fn().mockResolvedValue(true);
      configurarRegrasPadrao({ salvar, regrasVigentes: undefined });
      await render(<BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />);

      await fireEvent.press(screen.getByLabelText('Instagram'));
      await fireEvent.press(screen.getByLabelText('segunda'));
      await fireEvent.press(screen.getByText('Salvar'));

      await waitFor(() => expect(salvar).toHaveBeenCalled());
      expect(screen.queryByText('Antes de salvar')).toBeNull();
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
        <BloqueioAppsScreen uid="uid-1" aoTocarAtivar={jest.fn()} aoTocarSaibaOQueE={jest.fn()} aoTocarMedirTempo={jest.fn()} onVoltar={jest.fn()} />,
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

  describe('voltar', () => {
    const MENSAGEM_NAO_SALVAS = 'Suas alterações não foram salvas.';
    const VIGENTE = {
      apps: ['com.instagram.android'],
      janelas: [{ inicio: '09:00', fim: '18:00', diasSemana: [1, 2, 3, 4, 5] }],
    };

    async function renderizar(onVoltar = jest.fn()) {
      const showToast = jest.fn();
      useToast.mockReturnValue({ showToast });
      const resultado = await render(
        <BloqueioAppsScreen
          uid="uid-1"
          aoTocarAtivar={jest.fn()}
          aoTocarSaibaOQueE={jest.fn()}
          aoTocarMedirTempo={jest.fn()}
          onVoltar={onVoltar}
        />,
      );
      return { ...resultado, onVoltar, showToast };
    }

    // O mock de useVoltarFisico guarda o handler da última renderização —
    // chamá-lo é o mesmo que apertar o voltar físico do Android.
    function apertarVoltarFisico() {
      const chamadas = useVoltarFisico.mock.calls;
      return act(async () => {
        chamadas[chamadas.length - 1][0]();
      });
    }

    it('sem alteração, o botão voltar sai da tela sem nenhum aviso', async () => {
      configurarRegrasPadrao({ regrasVigentes: VIGENTE });
      const { onVoltar, showToast } = await renderizar();

      await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

      expect(onVoltar).toHaveBeenCalledTimes(1);
      expect(showToast).not.toHaveBeenCalled();
    });

    it('primeira configuração com a pré-marcação intacta não conta como alteração', async () => {
      configurarRegrasPadrao({ regrasVigentes: undefined });
      const { onVoltar, showToast } = await renderizar();

      await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

      expect(onVoltar).toHaveBeenCalledTimes(1);
      expect(showToast).not.toHaveBeenCalled();
    });

    it('com alteração não salva, sai da tela e avisa que não foi salva', async () => {
      configurarRegrasPadrao({ regrasVigentes: VIGENTE });
      const { onVoltar, showToast } = await renderizar();

      await fireEvent.press(screen.getByLabelText('WhatsApp'));
      await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

      expect(onVoltar).toHaveBeenCalledTimes(1);
      expect(showToast).toHaveBeenCalledWith(MENSAGEM_NAO_SALVAS);
    });

    it('depois de salvar, a edição deixa de contar como alteração não salva', async () => {
      configurarRegrasPadrao({ regrasVigentes: VIGENTE });
      const { onVoltar, showToast, rerender } = await renderizar();

      await fireEvent.press(screen.getByLabelText('WhatsApp'));
      // useRegrasBloqueio atualiza a pendente depois de gravar.
      configurarRegrasPadrao({
        regrasVigentes: VIGENTE,
        regrasPendentes: {
          ...VIGENTE,
          apps: ['com.instagram.android', 'com.whatsapp'],
          efetivaEm: '2026-10-23',
        },
      });
      await rerender(
        <BloqueioAppsScreen
          uid="uid-1"
          aoTocarAtivar={jest.fn()}
          aoTocarSaibaOQueE={jest.fn()}
          aoTocarMedirTempo={jest.fn()}
          onVoltar={onVoltar}
        />,
      );
      await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

      expect(onVoltar).toHaveBeenCalledTimes(1);
      expect(showToast).not.toHaveBeenCalled();
    });

    it('o voltar físico faz o mesmo que o botão voltar', async () => {
      configurarRegrasPadrao({ regrasVigentes: VIGENTE });
      const { onVoltar, showToast } = await renderizar();

      await fireEvent.press(screen.getByLabelText('WhatsApp'));
      await apertarVoltarFisico();

      expect(onVoltar).toHaveBeenCalledTimes(1);
      expect(showToast).toHaveBeenCalledWith(MENSAGEM_NAO_SALVAS);
    });

    it('no aviso de alteração pendente, o voltar físico volta pra edição sem sair nem salvar', async () => {
      const salvar = jest.fn().mockResolvedValue(true);
      configurarRegrasPadrao({ salvar, regrasVigentes: VIGENTE });
      const { onVoltar } = await renderizar();

      await fireEvent.press(screen.getByLabelText('WhatsApp'));
      await fireEvent.press(screen.getByText('Salvar'));
      expect(screen.getByText('Antes de salvar')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Voltar' })).toBeNull();

      await apertarVoltarFisico();

      expect(onVoltar).not.toHaveBeenCalled();
      expect(salvar).not.toHaveBeenCalled();
      expect(screen.queryByText('Antes de salvar')).toBeNull();
      expect(screen.getByText('Bloqueio de apps')).toBeTruthy();
    });
  });
});
