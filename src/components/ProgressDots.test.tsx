import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ProgressDots } from './ProgressDots';

describe('ProgressDots', () => {
  it('descreve o passo atual para leitores de tela', async () => {
    await render(<ProgressDots total={3} atual={1} />);
    expect(screen.getByLabelText('Passo 2 de 3')).toBeTruthy();
  });
});
