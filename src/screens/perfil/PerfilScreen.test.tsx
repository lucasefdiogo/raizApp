import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PerfilScreen } from './PerfilScreen';

describe('PerfilScreen', () => {
  it('renderiza o placeholder', async () => {
    await render(<PerfilScreen />);
    expect(screen.getByText('Perfil')).toBeTruthy();
  });
});
