import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { RootProgressIcon } from './RootProgressIcon';

describe('RootProgressIcon', () => {
  it('variant completo: ramo variável com traço e opacidade normais', async () => {
    await render(<RootProgressIcon variant="completo" />);

    const ramo = screen.getByTestId('root-progress-icon-ramo-variavel');
    expect(ramo.props.strokeWidth).toBe(4);
    expect(ramo.props.strokeOpacity).toBe(1);
  });

  it('variant reduzido: ramo mais fino e translúcido', async () => {
    await render(<RootProgressIcon variant="reduzido" />);

    const ramo = screen.getByTestId('root-progress-icon-ramo-variavel');
    expect(ramo.props.strokeWidth).toBe(2);
    expect(ramo.props.strokeOpacity).toBe(0.35);
  });

  it('variant escudo: ramo com largura normal, mas translúcido — distinto de reduzido', async () => {
    await render(<RootProgressIcon variant="escudo" />);

    const ramo = screen.getByTestId('root-progress-icon-ramo-variavel');
    expect(ramo.props.strokeWidth).toBe(4);
    expect(ramo.props.strokeOpacity).toBe(0.5);
  });

  it('variant broto: só o ponto de crescimento e um traço curto — sem ramificações', async () => {
    await render(<RootProgressIcon variant="broto" />);

    // tem o ponto de crescimento em Cobre
    expect(screen.getByTestId('root-progress-icon-ponto')).toBeTruthy();
    // e NÃO tem o ramo variável que todas as outras variantes têm
    expect(screen.queryByTestId('root-progress-icon-ramo-variavel')).toBeNull();
  });

  it('reduzido e escudo não têm o ponto de crescimento (broto é distinto delas)', async () => {
    const { rerender } = await render(<RootProgressIcon variant="reduzido" />);
    expect(screen.queryByTestId('root-progress-icon-ponto')).toBeNull();

    rerender(<RootProgressIcon variant="escudo" />);
    expect(screen.queryByTestId('root-progress-icon-ponto')).toBeNull();
  });

  describe('diasSequencia (crescimento contínuo do caule)', () => {
    it('omitido: mantém o caminho padrão de sempre (altura fixa)', async () => {
      await render(<RootProgressIcon variant="completo" />);
      const caule = screen.getByTestId('root-progress-icon-caule');
      expect(caule.props.d).toBe('M48 4 C48 28 48 40 48 92');
    });

    it('diasSequencia diferentes produzem caules com alturas (d) diferentes', async () => {
      const { rerender } = await render(
        <RootProgressIcon variant="completo" diasSequencia={1} />,
      );
      const caminho1 = screen.getByTestId('root-progress-icon-caule').props.d;

      await act(async () => {
        rerender(<RootProgressIcon variant="completo" diasSequencia={30} />);
      });
      const caminho30 = screen.getByTestId('root-progress-icon-caule').props.d;

      expect(caminho1).not.toBe(caminho30);
    });

    it('diasSequencia mais alto sempre produz caule mais alto (ponto final maior)', async () => {
      const { rerender } = await render(
        <RootProgressIcon variant="completo" diasSequencia={1} />,
      );
      const fimDia1 = Number(
        screen.getByTestId('root-progress-icon-caule').props.d.split(' ').pop(),
      );

      await act(async () => {
        rerender(<RootProgressIcon variant="completo" diasSequencia={30} />);
      });
      const fimDia30 = Number(
        screen.getByTestId('root-progress-icon-caule').props.d.split(' ').pop(),
      );

      expect(fimDia30).toBeGreaterThan(fimDia1);
    });

    it('diasSequencia=90 produz o mesmo caminho do padrão (teto igual à altura fixa de sempre)', async () => {
      await render(<RootProgressIcon variant="completo" diasSequencia={90} />);
      const caule = screen.getByTestId('root-progress-icon-caule');
      expect(caule.props.d).toBe('M48 4 C48 28 48 40 48 92');
    });

    it('variant broto ignora diasSequencia — mantém o caule curto do broto', async () => {
      await render(<RootProgressIcon variant="broto" diasSequencia={30} />);
      const caule = screen.getByTestId('root-progress-icon-caule');
      expect(caule.props.d).toBe('M48 8 C48 16 48 22 48 32');
    });
  });
});
