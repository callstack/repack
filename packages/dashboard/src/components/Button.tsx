import * as React from 'react';
import cx from 'classnames';

interface Props {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Button({ children, onClick, className }: Props) {
  return (
    <button
      className={cx(
        'px-2 py-1 flex flex-row items-center rounded-sm hover:bg-gray-600 text-gray-300 hover:text-gray-200 border-2 border-gray-600 transition ease-in duration-100',
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
