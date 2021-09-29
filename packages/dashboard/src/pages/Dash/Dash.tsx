import * as React from 'react';
import { Admonition } from '../../components/Admonition';
import { PageLayout } from '../../components/PageLayout';
import { useDevServer } from '../../hooks/useDevServer';
import { PlatformCompilation } from './PlatformCompilation';
import { PlatformDash } from './PlatformDash';

export function Dash() {
  const { getPlatforms } = useDevServer();
  const platforms = getPlatforms();

  return (
    <PageLayout title="Dash">
      <div className="flex flex-row flex-wrap">
        {!platforms.length ? (
          <Admonition type="info" className="mt-2">
            There are no compilations yet. Start Re.Pack development server and
            request a bundle from your React Native application first.
          </Admonition>
        ) : null}
        {React.useMemo(
          () =>
            platforms.map((platform) => (
              <div className="w-full 2xl:w-1/2 p-6" key={platform}>
                <h2 className="text-gray-300 font-medium text-2xl uppercase mb-2">
                  {platform}
                </h2>
                <PlatformCompilation platform={platform} />
                <PlatformDash platform={platform} />
              </div>
            )),
          [platforms]
        )}
      </div>
    </PageLayout>
  );
}
