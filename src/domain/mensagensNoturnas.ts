// Night-time intent pause messages (HU-06, RN-09 / RN-13).
// Pure module: the last shown index is persisted by the caller.

export const MENSAGENS_NOTURNAS: string[] = [
  'O descanso de hoje é o foco de amanhã.',
  'Esta hora costuma ser de tela. Dá para escolher outra coisa.',
  'Noites mais calmas deixam as manhãs mais leves.',
  'Respirar fundo antes de abrir também é uma escolha.',
  'O que pode esperar até amanhã costuma esperar bem.',
  'Quem dorme melhor começa o dia com menos esforço.',
  'Fechar o dia devagar ajuda a mente a descer.',
  'Um gesto pequeno agora: água, luz baixa, silêncio.',
  'O feed continua lá amanhã. O seu descanso é agora.',
];

export function proximaMensagemNoturna(
  indiceAnterior: number | null | undefined,
): {
  indice: number;
  texto: string;
} {
  const tamanho = MENSAGENS_NOTURNAS.length;
  const valido =
    typeof indiceAnterior === 'number' &&
    Number.isInteger(indiceAnterior) &&
    indiceAnterior >= 0 &&
    indiceAnterior < tamanho;
  const indice = valido ? (indiceAnterior + 1) % tamanho : 0;
  return { indice, texto: MENSAGENS_NOTURNAS[indice] };
}
