import * as React from 'react';
import { Admonition } from '../../components/Admonition';
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
        {!getPlatforms().length ? (
          <Admonition type="info">
            There are no Webpack compilations. Request a bundle through your
            React Native application first.
          </Admonition>
        ) : null}
      </div>
    </PageLayout>
  );
}
