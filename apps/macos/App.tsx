/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {StatusBar} from 'react-native';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import {DesktopApp} from './src/DesktopApp';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <DesktopApp />
    </SafeAreaProvider>
  );
}

export default App;
