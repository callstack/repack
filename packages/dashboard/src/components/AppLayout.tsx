import * as React from 'react';
import { NavBar } from './NavBar';

interface Props {
  children?: React.ReactElement[];
}

export function AppLayout({ children }: Props) {
  return (
    <div className="bg-dark-300 pl-80 min-h-screen">
      <NavBar />
      <main className="text-gray-200 py-6 px-14 min-h-screen flex flex-col">
        {children}
      </main>
    </div>
  );
}
