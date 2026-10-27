import { calcularMetaSegundos } from '../domain/desafioReducao';
import { paraISOLocal } from '../domain/data';
import { inicioDaSemana } from '../domain/streak';
import { buscarUsuario, criarDesafio, salvarDailyLog } from '../services/firestore';

const BASE_SEGUNDOS_SEMEADO = 22800; // 6h20min — mesmo exemplo do spec.
const SEGUNDOS_POR_DIA = BASE_SEGUNDOS_SEMEADO / 7;

function somarDias(data: Date, dias: number): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias);
}

/**
 * Ferramenta de teste manual (`__DEV__`), não lógica de produto: semeia
 * `dailyLogs.usoApps` da semana anterior pro primeiro app bloqueado e cria
 * o desafio de redução dessa mesma semana já fechado com o resultado
 * pedido — pra validar o card/reflexão sem esperar uma semana real passar.
 */
export async function semearSemanaDesafioReducao(
  uid: string,
  resultado: 'concluido' | 'expirado',
): Promise<void> {
  const usuario = await buscarUsuario(uid);
  const app = usuario?.regrasBloqueio?.apps?.[0];
  if (!app) {
    throw new Error('Nenhum app bloqueado configurado — configure um antes de semear.');
  }

  const inicioSemanaAtual = inicioDaSemana(new Date());
  const inicioSemanaAnterior = somarDias(inicioSemanaAtual, -7);

  for (let i = 0; i < 7; i++) {
    const data = paraISOLocal(somarDias(inicioSemanaAnterior, i));
    await salvarDailyLog(uid, data, {
      data,
      tarefas: [],
      statusDia: 'pendente',
      escudoUsado: false,
      usoApps: { [app]: { segundos: SEGUNDOS_POR_DIA, aberturas: 1 } },
    });
  }

  const meta = calcularMetaSegundos(BASE_SEGUNDOS_SEMEADO);
  const progresso = resultado === 'concluido' ? meta - 300 : meta + 300;
  const dataInicio = paraISOLocal(inicioSemanaAnterior);
  const dataFim = paraISOLocal(somarDias(inicioSemanaAnterior, 6));

  await criarDesafio(uid, {
    id: `reducao_tempo_redes-${dataInicio}`,
    titulo: 'Até 5h 40min nas redes esta semana',
    tipo: 'reducao_tempo_redes',
    periodo: 'semanal',
    dataInicio,
    dataFim,
    meta,
    progresso,
    status: 'ativo',
    baseSegundos: BASE_SEGUNDOS_SEMEADO,
  });
}
