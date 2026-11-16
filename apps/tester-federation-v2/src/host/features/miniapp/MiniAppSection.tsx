import { ScriptManager } from '@callstack/repack/client';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import ActionButton from '../../ui/ActionButton';

const MiniAppChunkId = 'miniapp';

let loadedThisSession = false;

const MiniAppSection = () => {
  const [inMemory, setInMemory] = React.useState(loadedThisSession);
  const [MiniAppComponent, setMiniAppComponent] = React.useState<
    React.ComponentType | undefined
  >(undefined);

  const install = async () => {
    const bundle = await import(/* webpackChunkName: "miniapp" */ './MiniApp');
    loadedThisSession = true;
    setInMemory(true);
    setMiniAppComponent(() => bundle.default);
  };

  const clearCache = async () => {
    await ScriptManager.shared.invalidateScripts([MiniAppChunkId]);
    setMiniAppComponent(undefined);
  };

  return (
    <View style={styles.container}>
      <ActionButton
        testID="miniapp-install-button"
        label={inMemory ? 'Show from memory' : 'Install'}
        disabled={MiniAppComponent !== undefined}
        onPress={install}
      />
      <ActionButton
        testID="miniapp-clear-cache-button"
        label="Clear cache"
        variant="secondary"
        disabled={MiniAppComponent === undefined}
        onPress={clearCache}
      />
      <Text style={styles.note}>
        Code stays in memory until the app restarts. Clear cache only affects
        the next start.
      </Text>
      {MiniAppComponent ? <MiniAppComponent /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    gap: 8,
  },
  note: {
    fontSize: 13,
    color: '#6b5a60',
  },
});

export default MiniAppSection;
