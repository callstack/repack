import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import MainNavigator from './navigation/MainNavigator';
import { useDevTools } from './rozenite';

const App = () => {
  const navigationRef = useNavigationContainerRef();

  useDevTools(navigationRef);

  return (
    <NavigationContainer ref={navigationRef}>
      <MainNavigator />
    </NavigationContainer>
  );
};

export default App;
