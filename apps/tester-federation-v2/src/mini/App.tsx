import { NavigationContainer } from '@react-navigation/native';
import MainNavigator from './navigation/MainNavigator';

const MiniApp = () => {
  return (
    <NavigationContainer>
      <MainNavigator />
    </NavigationContainer>
  );
};

export default MiniApp;
