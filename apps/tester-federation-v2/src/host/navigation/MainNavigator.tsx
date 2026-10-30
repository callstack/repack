import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';

import AsyncChunkScreen from '../screens/AsyncChunkScreen';
import HomeScreen from '../screens/HomeScreen';
import HostAssetsScreen from '../screens/HostAssetsScreen';
import MiniAppInstallScreen from '../screens/MiniAppInstallScreen.tsx';
import MiniAppScreen from '../screens/MiniAppScreen';
import NativeWindScreen from '../screens/NativeWindScreen';
import ReanimatedScreen from '../screens/ReanimatedScreen';
import RemoteChunkScreen from '../screens/RemoteChunkScreen';
import RuntimeEventsScreen from '../screens/RuntimeEventsScreen';

export type MainStackParamList = {
  Home: undefined;
  HostAssets: undefined;
  MiniApp: undefined;
  RuntimeEvents: undefined;
  AsyncChunk: undefined;
  RemoteChunk: undefined;
  MiniAppInstall: undefined;
  NativeWind: undefined;
  Reanimated: undefined;
};

export type MainStackNavigationProp =
  NativeStackNavigationProp<MainStackParamList>;

const Main = createNativeStackNavigator<MainStackParamList>();

const MainNavigator = () => {
  return (
    <Main.Navigator
      screenOptions={{
        headerTitle: 'Host App',
        headerBackButtonDisplayMode: 'default',
        headerBackTitle: 'Back',
        headerLargeTitle: true,
        headerStyle: styles.header,
        headerLargeStyle: styles.largeHeader,
        headerTitleStyle: styles.headerTitle,
        headerLargeTitleStyle: styles.largeTitle,
        headerTintColor: 'rgba(255,255,255,1)',
      }}
    >
      <Main.Screen name="Home" component={HomeScreen} />
      <Main.Screen
        name="HostAssets"
        component={HostAssetsScreen}
        options={{
          title: 'Host Assets',
          headerTitle: 'Host Assets',
          headerLargeTitleEnabled: true,
          headerStyle: styles.header,
          headerLargeStyle: styles.hostAssetsLargeHeader,
          headerTitleStyle: styles.headerTitle,
          headerLargeTitleStyle: styles.hostAssetsLargeTitle,
        }}
      />
      <Main.Screen
        name="MiniApp"
        component={MiniAppScreen}
        options={{ headerStyle: { backgroundColor: '#FF9F00' } }}
      />
      <Main.Screen name="RuntimeEvents" component={RuntimeEventsScreen} />
      <Main.Screen name="AsyncChunk" component={AsyncChunkScreen} />
      <Main.Screen name="RemoteChunk" component={RemoteChunkScreen} />
      <Main.Screen name="MiniAppInstall" component={MiniAppInstallScreen} />
      <Main.Screen name="NativeWind" component={NativeWindScreen} />
      <Main.Screen name="Reanimated" component={ReanimatedScreen} />
    </Main.Navigator>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#3498DB', // Bright blue
  },
  headerTitle: {
    color: '#FFFFFF', // White text
  },
  largeHeader: {
    backgroundColor: 'transparent',
  },
  largeTitle: {
    color: '#2C3E50',
  },
  hostAssetsLargeHeader: {
    backgroundColor: 'transparent',
  },
  hostAssetsLargeTitle: {
    color: '#2C3E50',
  },
});

export default MainNavigator;
