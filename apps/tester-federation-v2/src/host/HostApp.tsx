import { NavigationContainer } from '@react-navigation/native';
import MainNavigator from './navigation/MainNavigator';

const HostApp = () => {
  return (
    <NavigationContainer>
      <MainNavigator />
    </NavigationContainer>
  );
};

export default HostApp;
