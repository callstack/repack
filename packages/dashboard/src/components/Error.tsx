import React from 'react';
import cx from 'classnames';

export function Error({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'mx-4 py-2 px-4 border-2 border-red-500 bg-red-900 rounded text-gray-100',
        className
      )}
    >
      {children}
    </div>
  );
}
