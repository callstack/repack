export type FeatureGroup = 'Mini Apps' | 'Runtime' | 'Chunks' | 'Plugins';

export type Feature = {
  key: string;
  name: string;
  group: FeatureGroup;
  screen: keyof import('./navigation/MainNavigator').MainStackParamList;
};

export const FEATURES: Feature[] = [
  { key: 'gallery', name: 'Gallery', group: 'Mini Apps', screen: 'MiniApp' },
  {
    key: 'host-assets',
    name: 'Host assets',
    group: 'Runtime',
    screen: 'HostAssets',
  },
  {
    key: 'runtime-events',
    name: 'Runtime events',
    group: 'Runtime',
    screen: 'RuntimeEvents',
  },
  {
    key: 'async-chunk',
    name: 'Async chunk',
    group: 'Chunks',
    screen: 'AsyncChunk',
  },
  {
    key: 'remote-chunk',
    name: 'Remote chunk',
    group: 'Chunks',
    screen: 'RemoteChunk',
  },
  {
    key: 'miniapp-install',
    name: 'Mini-app install',
    group: 'Chunks',
    screen: 'MiniAppInstall',
  },
  {
    key: 'nativewind',
    name: 'NativeWind',
    group: 'Plugins',
    screen: 'NativeWind',
  },
  {
    key: 'reanimated',
    name: 'Reanimated',
    group: 'Plugins',
    screen: 'Reanimated',
  },
];

export const FEATURE_GROUPS: FeatureGroup[] = [
  'Runtime',
  'Mini Apps',
  'Chunks',
  'Plugins',
];
