import * as React from 'react';

interface Props {
  title: string;
  children?: React.ReactNode;
}

export function PageLayout({ title, children }: Props) {
  return (
    <div className="mt-24 pt-3">
      <div className="flex flex-row">
        <h1 className="font-medium tracking-wide text-3xl">{title}</h1>
        <div className="ml-4 border-b-4 border-dark-400 flex-grow" />
      </div>
      <div className="py-10">{children}</div>
    </div>
  );
}
