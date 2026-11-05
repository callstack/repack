import { ScriptManager } from '@callstack/repack/client';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import ActionButton from '../../ui/ActionButton';

const MiniAppChunkId = 'miniapp';

const MiniAppSection = () => {
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);
  const [MiniAppComponent, setMiniAppComponent] = React.useState<
    React.ComponentType | undefined
  >(undefined);

  const install = async () => {
    const bundle = await import(/* webpackChunkName: "miniapp" */ './MiniApp');
    setMiniAppComponent(() => bundle.default);
    setIsInstalled(true);
  };

  const uninstall = async () => {
    await ScriptManager.shared.invalidateScripts([MiniAppChunkId]);
    setMiniAppComponent(undefined);
    setIsInstalled(false);
    setIsVisible(false);
  };

  return (
    <View style={styles.container}>
      <ActionButton
        testID="miniapp-install-button"
        label="Install"
        disabled={isInstalled}
        onPress={install}
      />
      <ActionButton
        testID="miniapp-uninstall-button"
        label="Remove"
        variant="secondary"
        disabled={!isInstalled}
        onPress={uninstall}
      />
      <ActionButton
        testID="miniapp-toggle-button"
        label={isVisible ? 'Hide' : 'Show'}
        variant="secondary"
        disabled={!isInstalled}
        onPress={() => setIsVisible((visible) => !visible)}
      />
      {isInstalled && isVisible && MiniAppComponent ? (
        <MiniAppComponent />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    gap: 8,
  },
});

export default MiniAppSection;
