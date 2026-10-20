// Reminder rules for "app blocking turned off" (HU-03). PURE functions: they
// receive epoch ms instants and work on the device's LOCAL calendar (RN-02:
// 09:00 of the device time), with no clock, React or Firebase.
//
// ATTENTION: this is the reference copy (tested with Jest) of the rules that
// really run in Kotlin (AvisoDesligamentoMaquina.kt), because the alarm and
// the receiver run without JS. Both copies are validated by the SAME fixture
// (domain/__fixtures__/avisoBloqueio.json, read by Jest and JUnit): change
// here, change there and in the fixture.

export type OrdemLembrete = 1 | 2;

export interface LembreteAgendavel {
  ordem: OrdemLembrete;
  /** Epoch ms of the local 09:00 when the reminder fires. */
  em: number;
}

export interface TextoLembrete {
  titulo: string;
  corpo: string;
}

export type UltimoEventoAcessibilidade = 'desligamento' | 'religamento' | null;

const HORA_LEMBRETE = 9;
const DIAS_ENTRE_LEMBRETES = 3;

const TEXTOS: Record<OrdemLembrete, TextoLembrete> = {
  1: {
    titulo: 'Bloqueio de apps desligado',
    corpo: 'Desligado desde ontem. Toque para religar quando quiser.',
  },
  2: {
    titulo: 'Bloqueio de apps desligado',
    corpo: 'Desligado há alguns dias. Toque para religar quando quiser.',
  },
};

/** Local 09:00 of the day `diasDepois` after the local day of `instante`. */
function noveHorasDepois(instante: number, diasDepois: number): number {
  const d = new Date(instante);
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + diasDepois,
    HORA_LEMBRETE,
    0,
    0,
    0,
  ).getTime();
}

/** RN-02: 1st at 09:00 the day after the shutdown; 2nd three days after the 1st, 09:00; nothing else. */
export function horariosLembretes(desligadoEm: number): [number, number] {
  return [
    noveHorasDepois(desligadoEm, 1),
    noveHorasDepois(desligadoEm, 1 + DIAS_ENTRE_LEMBRETES),
  ];
}

/**
 * Reminders that can still be scheduled: none if the service was turned back
 * on after the shutdown, otherwise only those strictly after `agora`
 * (also used to reschedule on boot).
 */
export function lembretesAgendaveis(
  desligadoEm: number,
  religadoEm: number | null,
  agora: number,
): LembreteAgendavel[] {
  if (religadoEm !== null && religadoEm >= desligadoEm) {
    return [];
  }
  const [primeiro, segundo] = horariosLembretes(desligadoEm);
  const todos: LembreteAgendavel[] = [
    { ordem: 1, em: primeiro },
    { ordem: 2, em: segundo },
  ];
  return todos.filter(l => l.em > agora);
}

/** RN-04. */
export function textoLembrete(ordem: OrdemLembrete): TextoLembrete {
  return TEXTOS[ordem];
}

export interface CondicoesExibicao {
  servicoDesligado: boolean;
  temRegrasBloqueio: boolean;
  jaAtivadoAlgumaVez: boolean;
  notificacoesAtivas: boolean;
}

/** RN-03: if any condition fails the reminder is silently dropped. */
export function deveExibirLembrete(c: CondicoesExibicao): boolean {
  return (
    c.servicoDesligado &&
    c.temRegrasBloqueio &&
    c.jaAtivadoAlgumaVez &&
    c.notificacoesAtivas
  );
}

export interface CondicoesRegistroNaAbertura {
  servicoDesligado: boolean;
  ultimoEvento: UltimoEventoAcessibilidade;
}

/** RN-06: service is off and the last recorded event is not already a shutdown. */
export function deveRegistrarDesligamentoNaAbertura(
  c: CondicoesRegistroNaAbertura,
): boolean {
  return c.servicoDesligado && c.ultimoEvento !== 'desligamento';
}
