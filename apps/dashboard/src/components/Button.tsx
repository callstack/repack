import React from 'react';
import cx from 'classnames';

export function Button({
  type,
  children,
  onClick,
  className,
  active,
}: {
  type: 'primary' | 'auxilary' | 'none';
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'text-gray-200 focus:outline-none',
        type !== 'none' && 'mx-4 py-2 px-4 border-2 rounded',
        {
          'border-blue-400 bg-blue-400 !bg-opacity-0 hover:!bg-opacity-50':
            type === 'primary',
          'border-gray-400 bg-gray-400 !bg-opacity-0 hover:!bg-opacity-50':
            type === 'auxilary',
        },
        active && '!bg-opacity-40',
        className
      )}
    >
      {children}
    </button>
  );
}
