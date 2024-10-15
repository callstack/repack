import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { MainStackNavigationProp } from '../navigation/MainNavigator';

const HomeScreen = () => {
  const navigation = useNavigation<MainStackNavigationProp>();

  return (
    <View style={styles.container}>
      <View style={styles.hostSection}>
        <Text style={styles.title}>Welcome Home</Text>
        <Text style={styles.subtitle}>
          Explore the host app and its features
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Detail')}
        >
          <Text style={styles.buttonText}>See details</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.miniAppSection}>
        <Text style={styles.sectionTitle}>Mini Apps</Text>
        <View style={styles.miniAppContainer}>
          <TouchableOpacity
            style={[styles.miniAppButton, styles.galleryButton]}
            onPress={() => navigation.navigate('MiniApp')}
          >
            <Text style={styles.miniAppIcon}>🖼️</Text>
            <Text style={[styles.miniAppText, styles.galleryButtonText]}>
              Gallery
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.miniAppButton, styles.disabledMiniApp]}
            disabled={true}
          >
            <Text style={styles.miniAppIcon}>💬</Text>
            <Text style={[styles.miniAppText, styles.disabledText]}>
              Messages
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.miniAppButton, styles.disabledMiniApp]}
            disabled={true}
          >
            <Text style={styles.miniAppIcon}>⚙️</Text>
            <Text style={[styles.miniAppText, styles.disabledText]}>
              Settings
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  hostSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2C3E50',
  },
  subtitle: {
    fontSize: 16,
    color: '#34495E',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3498DB',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  miniAppSection: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#34495E',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
    color: '#2C3E50',
    textAlign: 'center',
  },
  miniAppContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    minHeight: 150,
  },
  miniAppButton: {
    backgroundColor: '#ECF0F1',
    width: 100,
    height: 100,
    borderColor: '#BDC3C7',
    borderWidth: 1,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  galleryButton: {
    borderColor: '#FF9F00',
    backgroundColor: '#FFF5E6',
  },
  galleryButtonText: {
    color: '#FF9F00',
  },
  miniAppIcon: {
    fontSize: 40,
    marginBottom: 5,
    color: '#FFFFFF',
  },
  miniAppText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledMiniApp: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#95A5A6',
  },
});

export default HomeScreen;
