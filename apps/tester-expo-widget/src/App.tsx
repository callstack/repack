import { SafeAreaView, StyleSheet } from 'react-native';
import Widget from './Widget';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <Widget />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
});
