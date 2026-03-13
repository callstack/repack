import {
  type NativeStackNavigationProp,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';

import DetailScreen from '../screens/DetailScreen';
import HomeScreen from '../screens/HomeScreen';
import MiniAppScreen from '../screens/MiniAppScreen';

export type MainStackParamList = {
  Home: undefined;
  Detail: undefined;
  MiniApp: undefined;
};

export type MainStackNavigationProp =
  NativeStackNavigationProp<MainStackParamList>;

const Main = createNativeStackNavigator<MainStackParamList>();

const MainNavigator = () => {
  return (
    <Main.Navigator
      screenOptions={{
        headerTitle: 'Host App',
        headerBackTitleVisible: true,
        headerBackTitle: 'Back',
        headerLargeTitle: true,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: 'rgba(255,255,255,1)',
      }}
    >
      <Main.Screen name="Home" component={HomeScreen} />
      <Main.Screen name="Detail" component={DetailScreen} />
      <Main.Screen
        name="MiniApp"
        component={MiniAppScreen}
        options={{ headerStyle: { backgroundColor: '#FF9F00' } }}
      />
    </Main.Navigator>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#3498DB',
  },
  headerTitle: {
    color: '#FFFFFF',
  },
});

export default MainNavigator;
