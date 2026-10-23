import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ContagemEspera } from './ContagemEspera';

describe('HU-11 · ContagemEspera', () => {
  it('mostra o texto já formatado e expõe como timer acessível', async () => {
    await render(<ContagemEspera texto="32 min" accessibilityLabel="Próximo acesso em 32 minutos" />);

    expect(screen.getByText('32 min')).toBeTruthy();
    expect(screen.getByRole('timer')).toBeTruthy();
    expect(screen.getByLabelText('Próximo acesso em 32 minutos')).toBeTruthy();
  });
});
