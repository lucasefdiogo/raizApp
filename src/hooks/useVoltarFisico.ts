import { useCallback, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Enquanto a tela está em foco, o botão físico voltar do Android chama
 * `aoVoltar` em vez do comportamento padrão — pra telas cujo voltar faz
 * mais que `goBack()` (ex.: BloqueioAppsScreen avisa de alteração não
 * salva e fecha o aviso de alteração pendente antes de sair). Só em foco,
 * pra não interceptar o voltar de uma tela empurrada por cima dela.
 */
export function useVoltarFisico(aoVoltar: () => void): void {
  const aoVoltarRef = useRef(aoVoltar);
  aoVoltarRef.current = aoVoltar;

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          aoVoltarRef.current();
          return true;
        },
      );
      return () => subscription.remove();
    }, []),
  );
}
