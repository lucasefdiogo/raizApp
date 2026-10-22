import { SUGESTOES_ALTERNATIVAS } from './sugestoesAlternativas';

describe('HU-07 · SUGESTOES_ALTERNATIVAS', () => {
  it('tem as 4 sugestões fixas na ordem do RN07', () => {
    expect(SUGESTOES_ALTERNATIVAS).toEqual([
      'Ler 10 páginas',
      'Caminhar 15 min',
      'Alongar 5 min',
      'Arrumar a mesa',
    ]);
  });
});
