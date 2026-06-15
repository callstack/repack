import {
  FlatList,
  Image,
  type ImageRequireSource,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const assets = [
  {
    source: require('../assets/pic_1.jpg'),
    status: 'Inlined',
    size: '89,400 bytes',
  },
  {
    source: require('../assets/pic_2.jpg'),
    status: 'Emitted',
    size: '121,569 bytes',
  },
  {
    source: require('../assets/pic_3.jpg'),
    status: 'Inlined',
    size: '59,862 bytes',
  },
];

const data = assets.map((asset, index) => ({
  title: `Host asset ${index + 1}`,
  ...asset,
}));

const AssetRow = ({
  title,
  source,
  status,
  size,
}: {
  title: string;
  source: ImageRequireSource;
  status: string;
  size: string;
}) => (
  <View style={styles.row}>
    <Image source={source} style={styles.image} />
    <View style={styles.titleContainer}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        <View
          style={[
            styles.badge,
            status === 'Inlined' ? styles.inlineBadge : styles.emittedBadge,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              status === 'Inlined'
                ? styles.inlineBadgeText
                : styles.emittedBadgeText,
            ]}
          >
            {status}
          </Text>
        </View>
      </View>
      <Text style={styles.size}>{size}</Text>
      <Text style={styles.subtitle}>
        Loaded from the host app bundle to test inline asset size limits
      </Text>
    </View>
  </View>
);

const HostAssetsScreen = () => {
  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.contentContainer}
      data={data}
      keyExtractor={(item) => item.title}
      renderItem={({ item }) => (
        <AssetRow
          title={item.title}
          source={item.source}
          status={item.status}
          size={item.size}
        />
      )}
      style={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  contentContainer: {
    paddingVertical: 20,
  },
  row: {
    marginBottom: 20,
    marginHorizontal: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#2C3E50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  titleContainer: {
    padding: 15,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 5,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inlineBadge: {
    backgroundColor: '#DFF5E7',
  },
  emittedBadge: {
    backgroundColor: '#FFF1D6',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inlineBadgeText: {
    color: '#1E7F45',
  },
  emittedBadgeText: {
    color: '#9A5A00',
  },
  size: {
    color: '#7F8C8D',
    fontSize: 13,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '400',
  },
});

export default HostAssetsScreen;
