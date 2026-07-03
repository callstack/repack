import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AsyncContainer } from './AsyncContainer';

const App = () => {
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>TesterAppRspack1</Text>
        <View style={styles.section}>
          <Text style={styles.heading}>Async chunk</Text>
          <AsyncContainer />
        </View>
        <View style={styles.section}>
          <Text style={styles.heading}>HMR test</Text>
          <Text>HMR target</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 16, gap: 16 },
  title: { fontSize: 24, fontWeight: 'bold' },
  section: { gap: 8 },
  heading: { fontSize: 18, fontWeight: '600' },
});

export default App;
