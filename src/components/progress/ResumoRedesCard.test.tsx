import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ResumoRedesCard } from './ResumoRedesCard';
import { ResumoCardSemana } from '../../domain/resumoRedes';

const RESUMO_BASE: ResumoCardSemana = {
  contadores: { sessoesUsadas: 18, acessosRapidos: 5, emergencias: 1 },
  duracaoTotal: '6h 40min',
  barras: [
    { data: '2026-10-19', segundos: 3600, hoje: true },
    { data: '2026-10-20', segundos: 7200, hoje: false },
    { data: '2026-10-21', segundos: null, hoje: false },
  ],
  comparacao: '40 min a mais que a semana passada',
};

describe('HU-08 · ResumoRedesCard', () => {
  it('Cenário 1: com acesso de uso, mostra eyebrow de redes, duração, barras e contadores', async () => {
    await render(
      <ResumoRedesCard comAcessoDeUso resumo={RESUMO_BASE} onMedirTempo={jest.fn()} />,
    );

    expect(screen.getByText('Redes sociais · esta semana')).toBeTruthy();
    expect(screen.getByText('6h 40min')).toBeTruthy();
    expect(screen.getByTestId('resumo-redes-chart')).toBeTruthy();
    expect(screen.getByText('18')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.queryByText('Medir tempo')).toBeNull();
  });

  it('Cenário 4: mostra a comparação quando presente', async () => {
    await render(
      <ResumoRedesCard comAcessoDeUso resumo={RESUMO_BASE} onMedirTempo={jest.fn()} />,
    );

    expect(screen.getByText('40 min a mais que a semana passada')).toBeTruthy();
  });

  it('Cenário 6: sem base de comparação, não mostra nenhum texto de comparação', async () => {
    await render(
      <ResumoRedesCard
        comAcessoDeUso
        resumo={{ ...RESUMO_BASE, comparacao: null }}
        onMedirTempo={jest.fn()}
      />,
    );

    expect(screen.queryByText(/semana passada/)).toBeNull();
  });

  it('Cenário 2: sem acesso de uso, mostra eyebrow de bloqueio, só contadores e o link "Medir tempo"', async () => {
    await render(
      <ResumoRedesCard
        comAcessoDeUso={false}
        resumo={{ ...RESUMO_BASE, duracaoTotal: '', barras: [], comparacao: null }}
        onMedirTempo={jest.fn()}
      />,
    );

    expect(screen.getByText('Bloqueio · esta semana')).toBeTruthy();
    expect(screen.getByText('18')).toBeTruthy();
    expect(screen.queryByText('6h 40min')).toBeNull();
    expect(screen.queryByTestId('resumo-redes-chart')).toBeNull();
    expect(screen.getByText('Medir tempo')).toBeTruthy();
  });

  it('Cenário 3: tocar em "Medir tempo" chama onMedirTempo', async () => {
    const onMedirTempo = jest.fn();
    await render(
      <ResumoRedesCard
        comAcessoDeUso={false}
        resumo={{ ...RESUMO_BASE, duracaoTotal: '', barras: [], comparacao: null }}
        onMedirTempo={onMedirTempo}
      />,
    );

    await fireEvent.press(screen.getByText('Medir tempo'));

    expect(onMedirTempo).toHaveBeenCalledTimes(1);
  });
});
