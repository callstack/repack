import nativePkg from '@react-navigation/native/package.json' with {
  type: 'json',
};
import nativeStackPkg from '@react-navigation/native-stack/package.json' with {
  type: 'json',
};
import reactPkg from 'react/package.json' with { type: 'json' };
import reactNativePkg from 'react-native/package.json' with { type: 'json' };
import safeAreaPkg from 'react-native-safe-area-context/package.json' with {
  type: 'json',
};
import screensPkg from 'react-native-screens/package.json' with {
  type: 'json',
};

const SHARED_SINGLETONS: Array<[name: string, version: string]> = [
  ['react', reactPkg.version],
  ['react-native', reactNativePkg.version],
  ['@react-navigation/native', nativePkg.version],
  ['@react-navigation/native-stack', nativeStackPkg.version],
  ['react-native-safe-area-context', safeAreaPkg.version],
  ['react-native-screens', screensPkg.version],
];

export function buildSharedSingletons(eager: boolean) {
  return Object.fromEntries(
    SHARED_SINGLETONS.map(([name, version]) => [
      name,
      { singleton: true, eager, version, requiredVersion: version },
    ])
  );
}
