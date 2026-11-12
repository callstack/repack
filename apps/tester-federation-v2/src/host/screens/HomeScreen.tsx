import { useNavigation } from '@react-navigation/native';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { FEATURE_GROUPS, FEATURES } from '../FEATURES';
import type { MainStackNavigationProp } from '../navigation/MainNavigator';

const HomeScreen = () => {
  const navigation = useNavigation<MainStackNavigationProp>();

  return (
    <ScrollView
      testID="home-screen"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Welcome Home</Text>
      <Text style={styles.subtitle}>Explore the host app and its features</Text>
      {FEATURE_GROUPS.filter((group) =>
        FEATURES.some((feature) => feature.group === group)
      ).map((group) => (
        <View key={group} style={styles.group}>
          <Text style={styles.groupTitle}>{group}</Text>
          {FEATURES.filter((feature) => feature.group === group).map(
            (feature) => (
              <TouchableOpacity
                key={feature.key}
                testID={`home-${feature.key}-button`}
                style={styles.button}
                onPress={() => navigation.navigate(feature.screen)}
              >
                <Text style={styles.buttonText}>{feature.name}</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      ))}
    </ScrollView>
  );
};

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

export default HomeScreen;
