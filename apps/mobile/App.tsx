import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {DagaryeoApp} from './src/DagaryeoApp';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#F4FBFC" />
      <DagaryeoApp />
    </SafeAreaProvider>
  );
}

export default App;
