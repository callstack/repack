import * as React from 'react';
import underConstruction from '../assets/undraw_under_construction_46pa.svg';
import { PageLayout } from '../components/PageLayout';

export function Artifacts() {
  return (
    <PageLayout title="Artifacts">
      <div className="flex flex-col items-center">
        <img
          className="w-1/2"
          src={underConstruction}
          alt="Under construction illustration"
        />
        <span className="text-gray-200 mt-8 text-lg">Under construction</span>
      </div>
    </PageLayout>
  );
}
