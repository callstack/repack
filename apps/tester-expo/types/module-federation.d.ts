declare module 'ExpoWidget/Widget' {
  import type { ComponentType } from 'react';

  const Widget: ComponentType<{ recoveryAttempt?: number }>;
  export default Widget;
}

declare module 'OrdinaryWidget/Widget' {
  import type { ComponentType } from 'react';

  const ExpoHostCard: ComponentType;
  export default ExpoHostCard;
}
