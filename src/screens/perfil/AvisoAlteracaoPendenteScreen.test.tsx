import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AvisoAlteracaoPendenteScreen } from './AvisoAlteracaoPendenteScreen';

describe('AvisoAlteracaoPendenteScreen', () => {
  it('HU-09 RN12: mostra o título "Antes de salvar", a explicação e os dois resumos', async () => {
    await render(
      <AvisoAlteracaoPendenteScreen
        resumoVigente="5 apps · seg a sex · 09:00–18:00"
        resumoNovo="4 apps · seg a sex · 09:00–20:00"
        onConfirmar={jest.fn()}
        onRevisar={jest.fn()}
      />,
    );

    expect(screen.getByText('Antes de salvar')).toBeTruthy();
    expect(
      screen.getByText(
        'Se a vontade de soltar o bloqueio apareceu agora, isso é só o momento falando — não precisa se cobrar por isso.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('HOJE CONTINUA')).toBeTruthy();
    expect(screen.getByText('5 apps · seg a sex · 09:00–18:00')).toBeTruthy();
    expect(screen.getByText('A PARTIR DE AMANHÃ')).toBeTruthy();
    expect(screen.getByText('4 apps · seg a sex · 09:00–20:00')).toBeTruthy();
  });

  it('HU-09 RN12: mostra a linha sobre desligar o serviço nas configurações do Android', async () => {
    await render(
      <AvisoAlteracaoPendenteScreen
        resumoVigente="Nenhum app bloqueado."
        resumoNovo="Nenhum app bloqueado."
        onConfirmar={jest.fn()}
        onRevisar={jest.fn()}
      />,
    );

    expect(
      screen.getByText(
        'Precisa parar agora? Dá para desligar o serviço nas configurações de acessibilidade do Android, a qualquer momento.',
      ),
    ).toBeTruthy();
  });

  it('"Entendi, confirmar" chama onConfirmar', async () => {
    const onConfirmar = jest.fn();
    await render(
      <AvisoAlteracaoPendenteScreen
        resumoVigente="Nenhum app bloqueado."
        resumoNovo="Nenhum app bloqueado."
        onConfirmar={onConfirmar}
        onRevisar={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByText('Entendi, confirmar'));

    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });

  it('"Voltar e revisar" chama onRevisar, sem confirmar', async () => {
    const onConfirmar = jest.fn();
    const onRevisar = jest.fn();
    await render(
      <AvisoAlteracaoPendenteScreen
        resumoVigente="Nenhum app bloqueado."
        resumoNovo="Nenhum app bloqueado."
        onConfirmar={onConfirmar}
        onRevisar={onRevisar}
      />,
    );

    await fireEvent.press(screen.getByText('Voltar e revisar'));

    expect(onRevisar).toHaveBeenCalledTimes(1);
    expect(onConfirmar).not.toHaveBeenCalled();
  });
});
