import notifee, { RepeatFrequency, TriggerType } from '@notifee/react-native';

const CANAL_ID = 'lembretes-rootora';
const ID_LEMBRETE_DIARIO = 'lembrete-diario';

const TITULO = 'Rootora';
const TEXTO_LEMBRETE_DIARIO = 'Hora de decidir sua vitória de hoje.';
const TEXTO_ALERTA_RISCO = 'Ainda dá tempo de cumprir sua tarefa essencial hoje.';

// "Perto do fim do dia" (regras-streak-e-textos-mvp.md) não tem horário
// exato especificado — 20:00 local do aparelho foi o valor combinado.
const HORA_ALERTA_RISCO = 20;

async function garantirCanal(): Promise<void> {
  await notifee.createChannel({ id: CANAL_ID, name: 'Lembretes' });
}

// Usa componentes de data LOCAIS (não toISOString/UTC) — o alerta é
// agendado em horário local (20:00 do aparelho), então o "dia" que
// identifica o agendamento precisa ser o mesmo dia local, senão os dois
// ficam fora de sincronia perto da meia-noite em fusos distantes de UTC.
function idAlertaRiscoDoDia(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `risco-streak-${ano}-${mes}-${dia}`;
}

export async function solicitarPermissao(): Promise<void> {
  await notifee.requestPermission();
}

/**
 * Cancela o lembrete diário anterior antes de criar o novo — trocar o
 * horário nunca duplica o agendamento, sempre há no máximo 1 pendente.
 */
export async function agendarLembreteDiario(horario: string): Promise<void> {
  await cancelarLembreteDiario();
  await garantirCanal();

  const [horas, minutos] = horario.split(':').map(Number);
  const proximoDisparo = new Date();
  proximoDisparo.setHours(horas, minutos, 0, 0);
  if (proximoDisparo.getTime() <= Date.now()) {
    proximoDisparo.setDate(proximoDisparo.getDate() + 1);
  }

  await notifee.createTriggerNotification(
    {
      id: ID_LEMBRETE_DIARIO,
      title: TITULO,
      body: TEXTO_LEMBRETE_DIARIO,
      android: { channelId: CANAL_ID },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: proximoDisparo.getTime(),
      repeatFrequency: RepeatFrequency.DAILY,
    },
  );
}

export async function cancelarLembreteDiario(): Promise<void> {
  await notifee.cancelTriggerNotification(ID_LEMBRETE_DIARIO);
}

/**
 * Reavalia o alerta de risco de hoje. Sempre cancela o agendamento anterior
 * de hoje primeiro (evita duplicata); só recria se a essencial ainda não
 * foi concluída e ainda faltam minutos pras 20:00 — depois desse horário,
 * ou com a essencial já concluída, não agenda nada.
 */
export async function avaliarNecessidadeAlertaRisco(
  essencialConcluidaHoje: boolean,
): Promise<void> {
  const agora = new Date();
  const id = idAlertaRiscoDoDia(agora);

  await notifee.cancelTriggerNotification(id);

  if (essencialConcluidaHoje) {
    return;
  }

  const disparo = new Date(agora);
  disparo.setHours(HORA_ALERTA_RISCO, 0, 0, 0);
  if (disparo.getTime() <= agora.getTime()) {
    return;
  }

  await garantirCanal();

  await notifee.createTriggerNotification(
    {
      id,
      title: TITULO,
      body: TEXTO_ALERTA_RISCO,
      android: { channelId: CANAL_ID },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: disparo.getTime(),
    },
  );
}

export async function cancelarTodasNotificacoes(): Promise<void> {
  await notifee.cancelAllNotifications();
}
