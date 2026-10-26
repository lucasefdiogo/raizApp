import { Tarefa } from './types';

export type TipoAlternativaDia = 'tarefa_essencial' | 'tarefa_comum' | 'noturna' | 'nenhuma';

const LIMITE_TITULO_PADRAO = 32;

/**
 * Tarefa do dia oferecida como alternativa na interceptação (fora da janela
 * noturna): essenciais pendentes têm prioridade sobre comuns, na ordem em
 * que chegam (mesma ordem da Home). Dentro do grupo escolhido, rotaciona
 * pela posição da sessão no dia — mesma posição do "{n}ª SESSÃO HOJE".
 */
export function escolherTarefaAlternativa(
  tarefas: Tarefa[],
  posicaoSessao: number,
): Tarefa | null {
  const pendentes = tarefas.filter(tarefa => !tarefa.concluida);
  const essenciais = pendentes.filter(tarefa => tarefa.essencial);
  const grupo = essenciais.length > 0 ? essenciais : pendentes.filter(tarefa => !tarefa.essencial);

  if (grupo.length === 0) {
    return null;
  }

  return grupo[(posicaoSessao - 1) % grupo.length];
}

/** Corta no último espaço antes do limite; sem espaço, corta no limite mesmo assim. */
export function truncarTitulo(titulo: string, limite: number = LIMITE_TITULO_PADRAO): string {
  if (titulo.length <= limite) {
    return titulo;
  }

  const trecho = titulo.slice(0, limite);
  const ultimoEspaco = trecho.lastIndexOf(' ');
  const cortado = ultimoEspaco > 0 ? trecho.slice(0, ultimoEspaco) : trecho;
  return `${cortado}…`;
}

/**
 * Na janela noturna, só a alternativa noturna já cadastrada vale — a tarefa
 * do dia nunca é oferecida nessa janela, mesmo com algo pendente.
 */
export function calcularTipoAlternativa(
  janelaNoturna: boolean,
  alternativaNoturnaTexto: string | null,
  tarefaAlternativa: Tarefa | null,
): TipoAlternativaDia {
  if (janelaNoturna) {
    return alternativaNoturnaTexto ? 'noturna' : 'nenhuma';
  }

  if (!tarefaAlternativa) {
    return 'nenhuma';
  }

  return tarefaAlternativa.essencial ? 'tarefa_essencial' : 'tarefa_comum';
}
