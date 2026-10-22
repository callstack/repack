import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { useNetworkActivityDevTools } from '@rozenite/network-activity-plugin';
import { useReactNavigationDevTools } from '@rozenite/react-navigation-plugin';
import {
  createAsyncStorageAdapter,
  useRozeniteStoragePlugin,
} from '@rozenite/storage-plugin';
import MainNavigator from './navigation/MainNavigator';

// ScriptManager caches remote scripts in AsyncStorage (see index.js).
const storages = [
  createAsyncStorageAdapter({ storages: { ScriptManager: AsyncStorage } }),
];

const App = () => {
  const navigationRef = useNavigationContainerRef();

  useNetworkActivityDevTools();
  useReactNavigationDevTools({ ref: navigationRef });
  useRozeniteStoragePlugin({ storages });

  return (
    <NavigationContainer ref={navigationRef}>
      <MainNavigator />
    </NavigationContainer>
  );
};

export default App;
