import { ScriptManager } from '@callstack/repack/client';
import React, { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button } from '../ui/Button';

type MiniAppContentRef = undefined | (() => JSX.Element);

export function MiniAppsContainer() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const miniAppContent = useRef<MiniAppContentRef>();

  const install = useCallback(async () => {
    const bundle = await import(/* webpackChunkName: "miniapp" */ './MiniApp');
    miniAppContent.current = bundle.default;
    setIsInstalled(true);
  }, []);

  const uninstall = useCallback(async () => {
    await ScriptManager.shared.invalidateScripts(['miniapp']);
    miniAppContent.current = undefined;
    setIsInstalled(false);
    setIsVisible(false);
  }, []);

  const toggle = useCallback(() => {
    setIsVisible((visible) => !visible);
  }, []);

  return (
    <View>
      <Button title="Install" disabled={isInstalled} onPress={install} />
      <Button title="Remove" disabled={!isInstalled} onPress={uninstall} />
      <Button
        title={isVisible ? 'Hide' : 'Show'}
        disabled={!isInstalled}
        onPress={toggle}
      />
      {isInstalled && isVisible && miniAppContent.current
        ? React.createElement(miniAppContent.current, {})
        : null}
    </View>
  );
}
