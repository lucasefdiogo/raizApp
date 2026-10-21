import React from 'react';
import type { ReactTestRendererJSON } from 'react-test-renderer';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { EsperaBloqueioScreen } from './EsperaBloqueioScreen';
import { RespiracaoEmergenciaScreen } from './RespiracaoEmergenciaScreen';

async function montarEspera(
  sobrescritas: Partial<React.ComponentProps<typeof EsperaBloqueioScreen>> = {},
) {
  const props = {
    variante: 'cooldown' as const,
    restanteMs: 32 * 60_000,
    blocoPorTarefaExtra: 1,
    onSessaoFoco: jest.fn(),
    onTarefasExtras: jest.fn(),
    onSair: jest.fn(),
    acessoRapidoDisponivel: true,
    esperaSeg: 5,
    emergenciaOferecida: false,
    onAcessoRapido: jest.fn(),
    onEmergencia: jest.fn(),
    ...sobrescritas,
  };
  await render(<EsperaBloqueioScreen {...props} />);
  return props;
}

async function passar(segundos: number) {
  for (let i = 0; i < segundos; i++) {
    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });
  }
}

const PROIBIDAS = /!|proteção|negada|bloqueada/i;

type No = ReactTestRendererJSON | string;

function coletar(no: No | No[] | null, saida: string[]): string[] {
  if (no === null) return saida;
  if (Array.isArray(no)) {
    no.forEach((n) => coletar(n, saida));
  } else if (typeof no === 'string') {
    saida.push(no);
  } else {
    const rotulo = no.props.accessibilityLabel;
    if (typeof rotulo === 'string') saida.push(rotulo);
    coletar(no.children, saida);
  }
  return saida;
}

/** Todo texto renderizado e todo rótulo de acessibilidade da tela atual. */
function textosVisiveis(): string[] {
  return coletar(screen.toJSON(), []);
}

describe('acesso rápido e emergência', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('CA-01: estado normal mostra o botão Acesso rápido (2 min) no cooldown', async () => {
    const props = await montarEspera();

    expect(screen.getByText('Acesso rápido (2 min)')).toBeTruthy();
    await fireEvent.press(screen.getByText('Acesso rápido (2 min)'));
    // espera de 5 s, sem campo de texto, antes de liberar
    expect(props.onAcessoRapido).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText(/./)).toBeNull();
    await passar(4);
    expect(props.onAcessoRapido).not.toHaveBeenCalled();
    await passar(1);
    expect(props.onAcessoRapido).toHaveBeenCalledTimes(1);
  });

  it('CA-05: estado carregando mostra a respiração de 60 segundos sem botão de pular', async () => {
    const onConcluir = jest.fn();
    await render(<RespiracaoEmergenciaScreen duracaoSeg={60} onConcluir={onConcluir} />);

    expect(screen.getByText('Respire um instante')).toBeTruthy();
    expect(screen.getByText('1:00')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    await passar(59);
    expect(onConcluir).not.toHaveBeenCalled();
    expect(screen.getByText('0:01')).toBeTruthy();
    await passar(1);
    expect(onConcluir).toHaveBeenCalledTimes(1);
  });

  it('CA-04: estado vazio mostra próximo acesso rápido em X min e a saída de emergência', async () => {
    const props = await montarEspera({
      acessoRapidoDisponivel: false,
      msAteProximo: 41 * 60_000 + 1,
      emergenciaOferecida: true,
    });

    expect(screen.getByText('Próximo acesso rápido em 42 min')).toBeTruthy();
    expect(screen.queryByText('Acesso rápido (2 min)')).toBeNull();
    await fireEvent.press(screen.getByText('Preciso agora (respiração de 1 min)'));
    expect(props.onEmergencia).toHaveBeenCalledTimes(1);
  });

  it('CA-04: cota esgotada não mostra botão nem promete retorno no dia', async () => {
    await montarEspera({
      acessoRapidoDisponivel: false,
      msAteProximo: undefined,
      emergenciaOferecida: true,
    });

    expect(screen.queryByText('Acesso rápido (2 min)')).toBeNull();
    expect(screen.queryByText(/Próximo acesso rápido em/)).toBeNull();
    expect(screen.getByText('Os acessos rápidos de hoje já foram usados')).toBeTruthy();
  });

  it('CA-06: com acesso rápido disponível a tela não mostra a saída de emergência', async () => {
    await montarEspera({ acessoRapidoDisponivel: true, emergenciaOferecida: false });
    expect(screen.queryByText('Preciso agora (respiração de 1 min)')).toBeNull();
  });

  it('CA-06: indisponível sem emergenciaOferecida também não mostra a saída de emergência', async () => {
    await montarEspera({
      acessoRapidoDisponivel: false,
      msAteProximo: 60_000,
      emergenciaOferecida: false,
    });
    expect(screen.queryByText('Preciso agora (respiração de 1 min)')).toBeNull();
    expect(screen.getByText('Próximo acesso rápido em 1 min')).toBeTruthy();
  });

  it('CA-02: o tempo de espera e a respiração têm texto acessível para o leitor de tela', async () => {
    await montarEspera();
    await fireEvent.press(screen.getByText('Acesso rápido (2 min)'));
    const espera = screen.getByTestId('acesso-rapido-espera');
    expect(espera.props.accessibilityLabel).toBe('Liberando em 5 segundos');
    expect(espera.props.accessibilityLiveRegion).toBe('polite');
    await passar(4);
    expect(screen.getByTestId('acesso-rapido-espera').props.accessibilityLabel).toBe(
      'Liberando em 1 segundo',
    );
  });

  it('CA-02: a respiração anuncia o tempo restante em segundos', async () => {
    await render(<RespiracaoEmergenciaScreen duracaoSeg={60} onConcluir={jest.fn()} />);
    const timer = screen.getByTestId('respiracao-contagem');
    expect(timer.props.accessibilityRole).toBe('timer');
    expect(timer.props.accessibilityLabel).toBe('Faltam 60 segundos');
    expect(timer.props.accessibilityLiveRegion).toBe('polite');
  });

  it('CA-03: nenhum texto das telas tem exclamação, a palavra proteção, negada ou bloqueada', async () => {
    const telas: React.ReactElement[] = [];
    const base = {
      variante: 'cooldown' as const,
      restanteMs: 60_000,
      blocoPorTarefaExtra: 1,
      onSessaoFoco: jest.fn(),
      onTarefasExtras: jest.fn(),
      onSair: jest.fn(),
      esperaSeg: 5,
      onAcessoRapido: jest.fn(),
      onEmergencia: jest.fn(),
    };
    telas.push(
      <EsperaBloqueioScreen {...base} acessoRapidoDisponivel emergenciaOferecida={false} />,
      <EsperaBloqueioScreen
        {...base}
        acessoRapidoDisponivel={false}
        msAteProximo={600_000}
        emergenciaOferecida
      />,
      <EsperaBloqueioScreen
        {...base}
        acessoRapidoDisponivel={false}
        emergenciaOferecida
      />,
      <RespiracaoEmergenciaScreen duracaoSeg={60} onConcluir={jest.fn()} />,
    );
    for (const tela of telas) {
      await render(tela);
      if (screen.queryByText('Acesso rápido (2 min)')) {
        await fireEvent.press(screen.getByText('Acesso rápido (2 min)'));
      }
      const textos = textosVisiveis();
      expect(textos.length).toBeGreaterThan(0);
      for (const t of textos) expect(t).not.toMatch(PROIBIDAS);
    }
  });
});
