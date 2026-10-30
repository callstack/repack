declare const __WITH_PRELOAD__: boolean;

declare module '*.svg' {
  import type { ComponentType } from 'react';

  const SvgComponent: ComponentType<{
    width?: number | string;
    height?: number | string;
    color?: string;
  }>;
  export default SvgComponent;
}

declare module 'MiniApp/MiniAppNavigator' {
  import type { ComponentType } from 'react';

  const MiniAppNavigator: ComponentType;
  export default MiniAppNavigator;
}
