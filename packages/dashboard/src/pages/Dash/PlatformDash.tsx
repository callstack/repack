import * as React from 'react';
import { Admonition } from '../../components/Admonition';
import { useStats } from '../../hooks/useStats';
import { useDevServer } from '../../hooks/useDevServer';
import { PlatformCounts } from './PlatformCounts';
import { PlatformBasics } from './PlatformBasics';
import { PlatformSizes } from './PlatformSizes';

interface Props {
  platform: string;
}

export function PlatformDash({ platform }: Props) {
  const { loading, data, refresh } = useStats(platform);

  const { getCompilerConnection } = useDevServer();

  React.useEffect(() => {
    const subscription = getCompilerConnection(platform).subscribe({
      next: (event) => {
        if (event.type === 'message' && event.payload.kind === 'compilation') {
          if (event.payload.event.name === 'invalid') {
            refresh();
          }
        }
      },
    });

    return () => subscription.unsubscribe();
  }, [getCompilerConnection, platform, refresh]);

  return (
    <div>
      {loading || !data ? (
        <Admonition type="progress" className="mt-2">
          The statistics will be displayed shortly, once the compilation is
          finished.
        </Admonition>
      ) : (
        <>
          <PlatformBasics stats={data} />
          <PlatformSizes stats={data} />
          <PlatformCounts stats={data} />
        </>
      )}
    </div>
  );
}
