import { ScriptManager } from '@callstack/repack/client';
import * as React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MiniAppChunkId = 'miniapp';

type Props = {
  onInvalidated: () => void;
};

const MiniAppSection = ({ onInvalidated }: Props) => {
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
    onInvalidated();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        testID="miniapp-install-button"
        style={[styles.button, isInstalled && styles.buttonDisabled]}
        disabled={isInstalled}
        onPress={install}
      >
        <Text style={styles.buttonText}>Install</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="miniapp-uninstall-button"
        style={[
          styles.button,
          styles.secondaryButton,
          !isInstalled && styles.buttonDisabled,
        ]}
        disabled={!isInstalled}
        onPress={uninstall}
      >
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>
          Remove
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="miniapp-toggle-button"
        style={[
          styles.button,
          styles.secondaryButton,
          !isInstalled && styles.buttonDisabled,
        ]}
        disabled={!isInstalled}
        onPress={() => setIsVisible((visible) => !visible)}
      >
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>
          {isVisible ? 'Hide' : 'Show'}
        </Text>
      </TouchableOpacity>
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
  button: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 30, 114, 1)',
  },
  secondaryButton: {
    backgroundColor: '#d8cbe8',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: '#200a12',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default MiniAppSection;
