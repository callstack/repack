import * as React from 'react';
import { PageLayout } from '../../components/PageLayout';
import { PlatformArtifacts } from './PlatformArtifacts';

export function Artifacts() {
  return (
    <PageLayout title="Artifacts">
      <div className="flex flex-row flex-wrap">
        <div className="w-full 2xl:w-1/2 p-6">
          <PlatformArtifacts
            platform="ios"
            assets={[
              { name: 'main.jsbundle', size: '2.5 MB' },
              { name: 'main.jsbundle.map', size: '10 MB' },
              {
                name: 'assets/node_modules/react-native/Libraries/NewWelcomeScreen/components/logo.png',
                size: '248 KB',
              },
            ]}
          />
        </div>
        <div className="w-full 2xl:w-1/2 p-6">
          <PlatformArtifacts
            platform="android"
            assets={[
              { name: 'main.jsbundle', size: '2.5 MB' },
              { name: 'main.jsbundle.map', size: '10 MB' },
              { name: 'assets/logo.png', size: '248 KB' },
              { name: 'assets/logo.png', size: '248 KB' },
            ]}
          />
        </div>
        <div className="w-full 2xl:w-1/2 p-6">
          <PlatformArtifacts
            platform="windows"
            assets={[
              { name: 'main.jsbundle', size: '2.5 MB' },
              { name: 'main.jsbundle.map', size: '10 MB' },
            ]}
          />
        </div>
        <div className="w-full 2xl:w-1/2 p-6">
          <PlatformArtifacts
            platform="tvos"
            assets={[
              { name: 'main.jsbundle', size: '2.5 MB' },
              { name: 'main.jsbundle.map', size: '10 MB' },
              { name: 'assets/logo.png', size: '248 KB' },
              { name: 'assets/logo.png', size: '248 KB' },
            ]}
          />
        </div>
      </div>
    </PageLayout>
  );
}
