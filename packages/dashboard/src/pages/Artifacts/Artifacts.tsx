import * as React from 'react';
import { PageLayout } from '../../components/PageLayout';
import { useDevServer } from '../../hooks/useDevServer';
import { PlatformArtifacts } from './PlatformArtifacts';

export function Artifacts() {
  const { getPlatforms } = useDevServer();

  return (
    <PageLayout title="Artifacts">
      <div className="flex flex-row flex-wrap">
        {React.useMemo(
          () =>
            getPlatforms().map((platform) => (
              <div className="w-full 2xl:w-1/2 p-6" key={platform}>
                <PlatformArtifacts platform={platform} />
              </div>
            )),
          [getPlatforms]
        )}
      </div>
    </PageLayout>
  );
}
