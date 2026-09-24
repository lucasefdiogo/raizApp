// Fonte ÚNICA de verdade pra "que dia é hoje" no Rootora — sempre hora
// LOCAL do aparelho, nunca UTC. Motivo: em GMT-3 (Brasília, sem horário de
// verão), Date.toISOString() já mostra o dia SEGUINTE a partir das 21h
// local (UTC = local + 3h) — um bug real visto em produção que gravava
// tarefas concluídas à noite no dailyLog de amanhã e travava o streak em 0,
// porque ultimoDiaAtivo e hojeISO "combinavam" (os dois erravam igual),
// só que três horas adiantados do dia real do usuário.
//
// Toda função aqui usa getFullYear/getMonth/getDate (ou o construtor
// `new Date(ano, mes, dia)`) — nunca getUTC*/setUTC*/Date.UTC/toISOString.
// Qualquer código que precise saber "que dia é hoje" (ou "ontem", ou a
// diferença entre duas datas) deve importar daqui, não reimplementar.

export function paraISOLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function hojeISOLocal(): string {
  return paraISOLocal(new Date());
}

/**
 * Reconstrói uma data LOCAL a partir de uma string YYYY-MM-DD — nunca
 * `new Date(iso)` nem `new Date(`${iso}T00:00:00Z`)`, que interpretam a
 * string como UTC e podem exibir o dia anterior em fusos negativos como
 * GMT-3 (getDate() de um Date UTC-meia-noite recua 1 dia no horário local).
 */
export function dataLocalDeISO(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

/**
 * "Ontem" em relação a `hoje` (Date ou string YYYY-MM-DD) — aceita os dois
 * formatos porque useStreak já tem o Date de "agora" em mãos (evita criar
 * outro), enquanto outros chamadores só têm a string.
 */
export function dataDeOntemLocal(hoje: Date | string): string {
  const base = typeof hoje === 'string' ? dataLocalDeISO(hoje) : hoje;
  const ontem = new Date(base.getFullYear(), base.getMonth(), base.getDate() - 1);
  return paraISOLocal(ontem);
}

/**
 * "Amanhã" em relação a `hoje` (Date ou string YYYY-MM-DD) — simétrica a
 * dataDeOntemLocal, mesmo racional (nunca soma 24h em milissegundos, que
 * quebra em mudança de horário de verão em fusos que o usam).
 */
export function dataDeAmanhaLocal(hoje: Date | string): string {
  const base = typeof hoje === 'string' ? dataLocalDeISO(hoje) : hoje;
  const amanha = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1);
  return paraISOLocal(amanha);
}

/**
 * Diferença em dias corridos entre duas datas YYYY-MM-DD (b - a), sempre
 * calculada a partir de meia-noite LOCAL das duas — nunca parse com sufixo
 * Z. Positivo quando `b` é posterior a `a`.
 */
export function diferencaEmDiasLocal(a: string, b: string): number {
  const dataA = dataLocalDeISO(a);
  const dataB = dataLocalDeISO(b);
  return Math.round(
    (dataB.getTime() - dataA.getTime()) / (1000 * 60 * 60 * 24),
  );
}
