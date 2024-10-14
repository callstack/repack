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
        headerBackTitleVisible: false,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: 'rgba(255,255,255,1)',
      }}
    >
      <Main.Screen name="Home" component={HomeScreen} />
      <Main.Screen name="Detail" component={DetailScreen} />
      <Main.Screen name="MiniApp" component={MiniAppScreen} />
    </Main.Navigator>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#3498DB', // Bright blue to match the button in HomeScreen
  },
  headerTitle: {
    color: '#FFFFFF', // White text to ensure readability
  },
});

export default MainNavigator;
