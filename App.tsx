/**
 * Rootora
 * @format
 */

import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { ToastProvider } from './src/contexts/ToastContext';
import { RootNavigator } from './src/navigation/RootNavigator';

// Web client (client_type: 3) do google-services.json — nunca o Android
// client (client_type: 1), que é só para verificar a assinatura do app.
GoogleSignin.configure({
  webClientId:
    '725763691112-tql30440u1qc0h9aeqsealbuk09b91jl.apps.googleusercontent.com',
});

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ToastProvider>
        <RootNavigator />
      </ToastProvider>
    </SafeAreaProvider>
  );
}

export default App;
