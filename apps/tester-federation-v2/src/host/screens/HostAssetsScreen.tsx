import {
  FlatList,
  Image,
  type ImageRequireSource,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Report from '../ui/Report';

type AssetItem = {
  key: string;
  title: string;
  subtitle: string;
  source: ImageRequireSource;
  report?: 'mode' | 'full';
  compact?: boolean;
};

const data: AssetItem[] = [
  {
    key: 'pic-1',
    title: 'Host asset 1',
    subtitle:
      'Loaded from the host app bundle to test inline asset size limits',
    source: require('../assets/pic_1.jpg'),
    report: 'mode',
  },
  {
    key: 'pic-2',
    title: 'Host asset 2',
    subtitle:
      'Loaded from the host app bundle to test inline asset size limits',
    source: require('../assets/pic_2.jpg'),
    report: 'mode',
  },
  {
    key: 'local',
    title: 'Local fixture',
    subtitle: 'Assets loader without inline options, always emitted as a file',
    source: require('../assets/localAssets/webpack.png'),
    report: 'full',
    compact: true,
  },
  {
    key: 'inline',
    title: 'Inline fixture',
    subtitle:
      'Assets loader with inline enabled, always inlined into the bundle',
    source: require('../assets/inlineAssets/webpack.png'),
    report: 'full',
    compact: true,
  },
];

const AssetRow = ({ item }: { item: AssetItem }) => {
  const resolved = Image.resolveAssetSource(item.source) as {
    uri: string;
    scale: number;
  };
  const isInline = resolved.uri.startsWith('data:');
  const status = isInline ? 'Inlined' : 'Emitted';

  return (
    <View style={styles.row}>
      <Image
        accessibilityIgnoresInvertColors
        source={item.source}
        style={item.compact ? styles.fixtureImage : styles.image}
      />
      <View style={styles.titleContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{item.title}</Text>
          <View
            style={[
              styles.badge,
              isInline ? styles.inlineBadge : styles.emittedBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isInline ? styles.inlineBadgeText : styles.emittedBadgeText,
              ]}
            >
              {status}
            </Text>
          </View>
        </View>
        {item.report ? (
          <View style={styles.reports}>
            <Report
              testID={`host-asset-${item.key}-mode-report`}
              name="mode"
              value={status}
            />
            {item.report === 'full' ? (
              <>
                <Report
                  testID={`host-asset-${item.key}-scale-report`}
                  name="scale"
                  value={resolved.scale}
                />
                <Report
                  testID={`host-asset-${item.key}-uri-report`}
                  name="uri"
                  value={
                    isInline ? `${resolved.uri.slice(0, 48)}…` : resolved.uri
                  }
                />
              </>
            ) : null}
          </View>
        ) : null}
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );
};

const HostAssetsScreen = () => {
  return (
    <FlatList
      testID="host-assets-screen"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.contentContainer}
      data={data}
      keyExtractor={(item) => item.key}
      renderItem={({ item }) => <AssetRow item={item} />}
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
  fixtureImage: {
    width: '100%',
    height: 96,
    resizeMode: 'contain',
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
  reports: {
    marginTop: 5,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '400',
  },
});

export default HostAssetsScreen;
