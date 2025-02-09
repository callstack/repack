import { NavigationContainer } from '@react-navigation/native';
import MainNavigator from './navigation/MainNavigator';

export default function App() {
  return (
    <NavigationContainer>
      <MainNavigator />
    </NavigationContainer>
  );
}
