import { RegrasBloqueio } from './types';

/**
 * Lista curada de redes sociais bloqueáveis (HU-01, RN-01). Fonte única:
 * o `<queries>` do AndroidManifest.xml declara exatamente estes pacotes —
 * mudar um lado exige mudar o outro.
 */
export const PACOTE_YOUTUBE = 'com.google.android.youtube';

export const PACOTES_REDES_SOCIAIS: readonly string[] = [
  'com.instagram.android',
  'com.zhiliaoapp.musically',
  'com.ss.android.ugc.trill',
  'com.kwai.video',
  'com.facebook.katana',
  'com.facebook.lite',
  'com.twitter.android',
  'com.instagram.barcelona',
  'com.reddit.frontpage',
  'com.pinterest',
  'com.snapchat.android',
  PACOTE_YOUTUBE,
];

/** Mantém só os apps instalados que pertencem à lista curada (RN-02). */
export function filtrarRedesSociaisInstaladas<T extends { packageName: string }>(
  instalados: T[],
): T[] {
  return instalados.filter((app) => PACOTES_REDES_SOCIAIS.includes(app.packageName));
}

/**
 * Marcações iniciais da tela (RN-03): sem regra salva (primeira
 * configuração) vêm marcados todos os apps listados, menos o YouTube; com
 * regra salva valem exatamente as marcações salvas, sem pré-marcação.
 */
export function appsIniciaisSelecionados(
  regrasSalvas: RegrasBloqueio | undefined,
  instalados: { packageName: string }[],
): string[] {
  if (regrasSalvas) {
    return regrasSalvas.apps;
  }
  return instalados.map((app) => app.packageName).filter((pacote) => pacote !== PACOTE_YOUTUBE);
}
