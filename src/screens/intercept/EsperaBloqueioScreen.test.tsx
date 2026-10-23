import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { EsperaBloqueioScreen } from './EsperaBloqueioScreen';
import { Valvula } from '../../domain/valvulas';

const VALVULA_SESSAO: Valvula = {
  tipo: 'sessao_foco',
  titulo: 'Sessão de foco',
  descricao: '5 minutos, sem tarefa',
  meta: '5 MIN',
  disponivel: true,
};

async function montar(
  sobrescritas: Partial<React.ComponentProps<typeof EsperaBloqueioScreen>> = {},
) {
  const props = {
    appIconeBase64: 'abc',
    appLabel: 'Instagram',
    variante: 'cooldown' as const,
    restanteMs: 45 * 60_000,
    cooldownTotalMs: 45 * 60_000,
    duracaoBlocoMin: 15,
    valvulas: [VALVULA_SESSAO],
    onValvula: jest.fn(),
    onVoltarAoInicio: jest.fn(),
    ...sobrescritas,
  };
  const resultado = await render(<EsperaBloqueioScreen {...props} />);
  return { props, ...resultado };
}

describe('HU-11 RN10 · EsperaBloqueioScreen', () => {
  it('Cenário 10: mostra "PAUSA ENTRE SESSÕES" e a contagem arredondada pra cima', async () => {
    await montar({ restanteMs: 31 * 60_000 + 15_000, cooldownTotalMs: 45 * 60_000 });

    expect(screen.getByText('PAUSA ENTRE SESSÕES')).toBeTruthy();
    expect(screen.getByText('32 min')).toBeTruthy();
  });

  it('abaixo de 1 minuto mostra a contagem em segundos', async () => {
    await montar({ restanteMs: 45_000 });

    expect(screen.getByText('45 s')).toBeTruthy();
  });

  it('mostra a linha "até a próxima sessão de {duracaoBlocoMin} min"', async () => {
    await montar({ duracaoBlocoMin: 15 });

    expect(screen.getByText('Até a próxima sessão de 15 min.')).toBeTruthy();
  });

  it('o texto acessível da contagem é por minuto, com região viva', async () => {
    await montar({ restanteMs: 30 * 60_000 + 15_000, cooldownTotalMs: 45 * 60_000 });

    const contagem = screen.getByTestId('contagem-espera');
    expect(contagem.props.accessibilityLabel).toBe('Próximo acesso em 31 minutos');
    expect(contagem.props.accessibilityLiveRegion).toBe('polite');
  });

  it('Cenário 17: saldo zerado mostra a headline e o texto de amanhã, sem contagem', async () => {
    await montar({ variante: 'zerado' });

    expect(screen.getByText('SESSÕES DE HOJE ENCERRADAS')).toBeTruthy();
    expect(screen.getByText('Por hoje, as sessões acabaram.')).toBeTruthy();
    expect(screen.getByText('Amanhã elas voltam. Enquanto isso, dá pra:')).toBeTruthy();
    expect(screen.queryByTestId('contagem-espera')).toBeNull();
  });

  it('mostra a válvula recebida e repassa o tipo ao tocar', async () => {
    const onValvula = jest.fn();
    await montar({ onValvula });

    expect(screen.getByText('Sessão de foco')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /Sessão de foco/ }));

    expect(onValvula).toHaveBeenCalledWith('sessao_foco');
  });

  it('"Voltar ao início" dispara o callback', async () => {
    const { props } = await montar();
    await fireEvent.press(screen.getByText('Voltar ao início'));
    expect(props.onVoltarAoInicio).toHaveBeenCalledTimes(1);
  });
});
