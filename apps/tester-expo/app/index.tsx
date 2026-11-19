import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FEATURE_GROUPS, FEATURES } from '../FEATURES';

export default function HomeRoute() {
  const router = useRouter();

  return (
    <ScrollView
      testID="home-screen"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Welcome Home</Text>
      <Text testID="router-ready" style={styles.subtitle}>
        Expo Router compiled by Re.Pack
      </Text>
      {FEATURE_GROUPS.map((group) => (
        <View key={group} style={styles.group}>
          <Text style={styles.groupTitle}>{group}</Text>
          {FEATURES.filter((feature) => feature.group === group).map(
            (feature) => (
              <TouchableOpacity
                key={feature.key}
                testID={`home-${feature.key}-button`}
                style={styles.button}
                onPress={() => router.navigate(feature.href)}
              >
                <Text style={styles.buttonText}>{feature.name}</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      ))}
      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#200a12',
  },
  subtitle: {
    fontSize: 16,
    color: '#55424a',
    marginBottom: 12,
  },
  group: {
    gap: 6,
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(56, 30, 114, 1)',
    marginBottom: 4,
  },
  button: {
    backgroundColor: 'rgba(56, 30, 114, 1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
});
