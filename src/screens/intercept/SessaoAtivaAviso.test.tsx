import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SessaoAtivaAviso } from './SessaoAtivaAviso';
import { EsperaBloqueioScreen } from './EsperaBloqueioScreen';
import { PausaIntencaoScreen } from './PausaIntencaoScreen';

describe('SessaoAtivaAviso', () => {
  it('CA-03: estado carregando mostra o tempo restante da sessão e o aviso 1 minuto restante', async () => {
    await render(<SessaoAtivaAviso msRestantes={45_000} avisoUmMinuto />);

    expect(screen.getByText('00:45')).toBeTruthy();
    const aviso = screen.getByText('1 minuto restante');
    expect(aviso).toBeTruthy();
  });

  it('CA-03: sem o aviso ativo mostra só o tempo restante', async () => {
    await render(<SessaoAtivaAviso msRestantes={12 * 60_000 + 41_000} avisoUmMinuto={false} />);

    expect(screen.getByText('12:41')).toBeTruthy();
    expect(screen.queryByText('1 minuto restante')).toBeNull();
  });

  it('CA-02: o tempo restante da sessão tem texto acessível por minuto e região viva', async () => {
    await render(<SessaoAtivaAviso msRestantes={12 * 60_000 + 41_000} avisoUmMinuto={false} />);

    const tempo = screen.getByTestId('sessao-tempo');
    expect(tempo.props.accessibilityLabel).toBe('Tempo restante da sessão: 13 minutos');
    expect(tempo.props.accessibilityRole).toBe('timer');
    expect(tempo.props.accessibilityLiveRegion).toBe('polite');
  });

  it('CA-02: o aviso é uma região viva educada, não bloqueante', async () => {
    await render(<SessaoAtivaAviso msRestantes={30_000} avisoUmMinuto />);

    const aviso = screen.getByTestId('sessao-aviso');
    expect(aviso.props.accessibilityLiveRegion).toBe('polite');
    expect(aviso.props.accessibilityRole).toBe('alert');
  });

  it('CA-02: no último minuto o texto acessível diz menos de 1 minuto', async () => {
    await render(<SessaoAtivaAviso msRestantes={30_000} avisoUmMinuto />);

    expect(screen.getByTestId('sessao-tempo').props.accessibilityLabel).toBe(
      'Tempo restante da sessão: menos de 1 minuto',
    );
  });

  it('CA-02: o tempo restante da sessão e do cooldown tem texto acessível para o leitor de tela', async () => {
    await render(
      <>
        <SessaoAtivaAviso msRestantes={12 * 60_000 + 41_000} avisoUmMinuto={false} />
        <EsperaBloqueioScreen
          appIconeBase64="abc"
          appLabel="Instagram"
          variante="cooldown"
          restanteMs={45 * 60_000}
          duracaoBlocoMin={15}
          valvulas={[]}
          onValvula={jest.fn()}
          onVoltarAoInicio={jest.fn()}
        />
      </>,
    );

    expect(screen.getByLabelText('Tempo restante da sessão: 13 minutos')).toBeTruthy();
    expect(screen.getByLabelText('Próximo acesso em 45 minutos')).toBeTruthy();
  });

  it('CA-03: nenhum texto das telas de sessão tem exclamação nem a palavra proteção', async () => {
    await render(
      <>
        <PausaIntencaoScreen
          appIconeBase64="abc"
          appLabel="Instagram"
          duracaoSeg={10}
          duracaoBlocoMin={15}
          posicaoSessao={1}
          saldo={2}
          onLiberar={jest.fn()}
          onAgoraNao={jest.fn()}
        />
        <SessaoAtivaAviso msRestantes={30_000} avisoUmMinuto />
        <EsperaBloqueioScreen
          appIconeBase64="abc"
          appLabel="Instagram"
          variante="cooldown"
          restanteMs={45 * 60_000}
          duracaoBlocoMin={15}
          valvulas={[]}
          onValvula={jest.fn()}
          onVoltarAoInicio={jest.fn()}
        />
        <EsperaBloqueioScreen
          appIconeBase64="abc"
          appLabel="Instagram"
          variante="zerado"
          restanteMs={0}
          duracaoBlocoMin={15}
          valvulas={[]}
          onValvula={jest.fn()}
          onVoltarAoInicio={jest.fn()}
        />
      </>,
    );

    expect(screen.queryByText(/!/)).toBeNull();
    expect(screen.queryByText(/prote[cç][aã]o/i)).toBeNull();
    expect(screen.queryByText(/desculp/i)).toBeNull();
  });
});
