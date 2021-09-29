import * as React from 'react';
import cx from 'classnames';

interface Props {
  type: 'info' | 'progress';
  children: React.ReactNode;
  className?: string;
}

export function Admonition({ type, children, className }: Props) {
  return (
    <mark
      className={cx(
        'bg-dark-400 text-gray-300 px-6 py-3 border-l-8 flex flex-row items-center',
        { 'border-blue-700': type === 'info' || type === 'progress' },
        className
      )}
    >
      <span
        className={cx('material-icons mr-2', {
          'text-blue-200': type === 'info',
          'text-blue-200 animate-spin': type === 'progress',
        })}
      >
        {type === 'info' ? 'info' : 'autorenew'}
      </span>
      {children}
    </mark>
  );
}
