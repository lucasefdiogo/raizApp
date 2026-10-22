import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AlternativaNoturnaScreen } from './AlternativaNoturnaScreen';

async function montar() {
  const onSalvar = jest.fn();
  const onAgoraNao = jest.fn();
  await render(
    <AlternativaNoturnaScreen onSalvar={onSalvar} onAgoraNao={onAgoraNao} />,
  );
  return { onSalvar, onAgoraNao };
}

describe('AlternativaNoturnaScreen', () => {
  it('CA-03: pergunta a alternativa noturna e Salvar entrega o texto escrito', async () => {
    const { onSalvar } = await montar();

    expect(
      screen.getByText('O que você gostaria de fazer à noite?'),
    ).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText('Alternativa noturna (opcional)'),
      'Ler um pouco',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(onSalvar).toHaveBeenCalledWith('Ler um pouco');
  });

  it('CA-03: Agora não dispensa a pergunta sem salvar nada', async () => {
    const { onSalvar, onAgoraNao } = await montar();

    await fireEvent.changeText(
      screen.getByLabelText('Alternativa noturna (opcional)'),
      'Ler um pouco',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Agora não' }));

    expect(onAgoraNao).toHaveBeenCalledTimes(1);
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('CA-03: Salvar com o campo vazio não grava e dispensa a pergunta', async () => {
    const { onSalvar, onAgoraNao } = await montar();

    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));

    expect(onSalvar).not.toHaveBeenCalled();
    expect(onAgoraNao).toHaveBeenCalledTimes(1);
  });
});
