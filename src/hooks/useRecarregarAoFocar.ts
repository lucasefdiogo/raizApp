import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Chama `recarregar` toda vez que a tela ganha foco — inclui o mount
 * inicial e qualquer volta de navegação (ex: editar algo numa tela
 * empurrada na mesma stack e voltar). Sem isso, uma tela que só busca
 * dados no próprio mount mostra informação obsoleta depois de voltar de
 * uma tela que alterou esse dado, porque telas empurradas na mesma stack
 * não desmontam a tela anterior — só perdem o foco.
 */
export function useRecarregarAoFocar(recarregar: () => void): void {
  useFocusEffect(
    useCallback(() => {
      recarregar();
    }, [recarregar]),
  );
}
