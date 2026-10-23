export type FeatureGroup =
  | 'Mini Apps'
  | 'Navigation'
  | 'Runtime'
  | 'Chunks'
  | 'Plugins';

export type Feature = {
  key: string;
  name: string;
  group: FeatureGroup;
  screen: keyof import('./navigation/MainNavigator').MainStackParamList;
};

export const FEATURES: Feature[] = [
  { key: 'gallery', name: 'Gallery', group: 'Mini Apps', screen: 'MiniApp' },
  { key: 'details', name: 'Detail', group: 'Navigation', screen: 'Detail' },
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
    screen: 'MiniappInstall',
  },
];

export const FEATURE_GROUPS: FeatureGroup[] = [
  'Navigation',
  'Runtime',
  'Mini Apps',
  'Chunks',
  'Plugins',
];
