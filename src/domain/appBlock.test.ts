import { alternarAppNaSelecao } from './appBlock';

describe('alternarAppNaSelecao', () => {
  it('adiciona o package quando ainda não está selecionado', () => {
    expect(alternarAppNaSelecao([], 'com.instagram.android')).toEqual([
      'com.instagram.android',
    ]);
    expect(
      alternarAppNaSelecao(['com.zhiliaoapp.musically'], 'com.instagram.android'),
    ).toEqual(['com.zhiliaoapp.musically', 'com.instagram.android']);
  });

  it('remove o package quando já está selecionado', () => {
    expect(
      alternarAppNaSelecao(
        ['com.instagram.android', 'com.zhiliaoapp.musically'],
        'com.instagram.android',
      ),
    ).toEqual(['com.zhiliaoapp.musically']);
  });

  it('não muta o array recebido', () => {
    const original = ['com.instagram.android'];
    alternarAppNaSelecao(original, 'com.whatsapp');
    expect(original).toEqual(['com.instagram.android']);
  });
});
