import React, { useMemo, useState } from 'react';
import cx from 'classnames';

interface Tab {
  label: string;
  body: React.ComponentType;
}

interface Props {
  tabs: Tab[];
}

export function Layout({ tabs }: Props) {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const Body = activeTab.body;

  return (
    <div className="bg-black pl-80 min-h-screen">
      <nav className="w-80 h-screen fixed top-0 left-0 border-r-2 border-gray-800 flex flex-col">
        <div className="py-6 px-8">
          <img src="/dashboard/static/media/logo.svg" alt="Re.pack" />
        </div>
        <div className="mt-20">
          {useMemo(
            () =>
              tabs.map((tab) => (
                <NavButton
                  key={tab.label}
                  active={tab.label === activeTab.label}
                  onClick={() => {
                    setActiveTab(tab);
                  }}
                >
                  {tab.label}
                </NavButton>
              )),
            [activeTab, tabs]
          )}
        </div>
      </nav>
      <main className="text-gray-200 py-6 px-8">
        <Body />
      </main>
    </div>
  );
}

function NavButton({
  children,
  active,
  onClick,
}: {
  children: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'px-8 py-4 my-1 text-gray-200 w-full text-left text-xl border-l-8 border-gray-800',
        active && 'bg-gray-800 font-medium'
      )}
    >
      {children}
    </button>
  );
}
