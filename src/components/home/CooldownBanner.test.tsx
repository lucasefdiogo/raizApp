import React from 'react';
import { render } from '@testing-library/react-native';
import { CooldownBanner } from './CooldownBanner';

describe('HU-14 · CooldownBanner', () => {
  it('Cenário 5: mostra o tempo até a próxima sessão', async () => {
    const { getByText } = await render(<CooldownBanner minutosRestantes={32} />);
    expect(getByText('Próxima sessão em 32 min')).toBeTruthy();
  });

  it('RN10: não mostra nome de app nem qualquer outro dado pessoal', async () => {
    const { queryByText } = await render(<CooldownBanner minutosRestantes={5} />);
    expect(queryByText(/instagram|tiktok/i)).toBeNull();
  });
});
