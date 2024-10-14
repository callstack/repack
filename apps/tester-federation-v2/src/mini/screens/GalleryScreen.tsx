import {
  Image,
  type ImageRequireSource,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const pics = [
  require('../assets/pic_1.jpg'),
  require('../assets/pic_2.jpg'),
  require('../assets/pic_3.jpg'),
];

const data = Array(3)
  .fill('')
  .map((_, i) => ({
    title: `Picture ${i + 1}`,
    source: pics[i % pics.length],
  }));

const Row = ({
  title,
  source,
}: {
  title: string;
  source: ImageRequireSource;
}) => (
  <View style={styles.row}>
    <Image source={source} style={styles.image} />
    <View style={styles.titleContainer}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        The quick brown fox jumps over the lazy dog
      </Text>
    </View>
  </View>
);

const GalleryScreen = () => {
  return (
    <ScrollView style={styles.container}>
      {data.map(({ title, source }) => (
        <Row key={title} title={title} source={source} />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
    backgroundColor: '#E8F3F3', // Light teal background to match HostApp
  },
  row: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#34495E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 15,
  },
  image: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  titleContainer: {
    padding: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50', // Dark blue-gray to match HostApp
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#34495E', // Slightly lighter blue-gray
    fontWeight: '400',
  },
});

export default GalleryScreen;
