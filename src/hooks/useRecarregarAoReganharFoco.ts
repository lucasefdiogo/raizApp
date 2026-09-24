import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Chama `recarregar` quando a tela GANHA FOCO DE NOVO — ex: concluir uma
 * tarefa na aba Hoje e voltar pra aba Progresso, que não desmonta ao trocar
 * de aba (sem unmountOnBlur), então sem isso só um pull-to-refresh manual
 * atualizaria os dados. Ignora o primeiro foco (que coincide com o mount,
 * quando o próprio hook de dados já busca sozinho) pra não duplicar a
 * leitura inicial — ver useRecarregarAoFocar.ts pro caso em que o mount
 * TAMBÉM deve contar.
 */
export function useRecarregarAoReganharFoco(recarregar: () => void): void {
  const primeiroFocoRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (primeiroFocoRef.current) {
        primeiroFocoRef.current = false;
        return;
      }
      recarregar();
    }, [recarregar]),
  );
}
