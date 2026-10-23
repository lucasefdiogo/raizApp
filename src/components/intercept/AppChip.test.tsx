import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AppChip } from './AppChip';

describe('HU-11 RN01 · AppChip', () => {
  it('Cenário 1: mostra o ícone e o nome do app', async () => {
    await render(<AppChip iconeBase64="abc123" nome="Instagram" />);

    expect(screen.getByText('Instagram')).toBeTruthy();
    expect(screen.getByTestId('app-chip-icone').props.source).toEqual({
      uri: 'data:image/png;base64,abc123',
    });
  });
});
