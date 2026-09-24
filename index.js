/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { InterceptRoot } from './src/screens/intercept/InterceptRoot';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

// Root separado — a InterceptActivity (Etapa 4, Kotlin) monta este
// ReactRootView por cima do app bloqueado, com initialProps
// { packageName, appLabel, snapshot }, sem passar por App.tsx/RootNavigator
// (ver InterceptRoot.tsx pro porquê e o que ele monta sozinho).
AppRegistry.registerComponent('Intercept', () => InterceptRoot);
