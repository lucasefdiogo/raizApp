import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Enquanto a tela que chama esse hook está em foco, "engole" o botão
 * físico voltar do Android: o listener de 'hardwareBackPress' retorna
 * `true`, o que impede a navegação/fechamento default. O listener é
 * registrado ao ganhar foco e removido ao perder foco (cleanup do próprio
 * useFocusEffect), então não afeta nenhuma outra tela.
 *
 * Uso: telas que não podem ser puladas antes do fluxo terminar
 * (RecoveryStateScreen, ReturnAfterPauseScreen). É só chamar sem args.
 */
export function useBlockHardwareBack(): void {
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => true,
      );

      return () => subscription.remove();
    }, []),
  );
}
