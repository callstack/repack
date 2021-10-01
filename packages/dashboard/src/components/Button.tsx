import * as React from 'react';
import cx from 'classnames';

interface Props {
  onClick?: () => void;
  disabled?: boolean;
  progress?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Button({
  children,
  onClick,
  className,
  disabled,
  progress,
}: Props) {
  return (
    <button
      disabled={disabled}
      className={cx(
        'px-2 py-1 rounded-sm border-2 transition ease-in duration-100 relative',
        disabled
          ? 'cursor-not-allowed text-gray-500 border-gray-700'
          : 'text-gray-300 border-gray-600 hover:text-gray-200 hover:bg-gray-600',
        className
      )}
      onClick={React.useCallback(() => {
        !disabled && onClick?.();
      }, [disabled, onClick])}
    >
      <div
        className={cx('flex flex-row items-center', progress && 'invisible')}
      >
        {children}
      </div>
      <div
        className={cx(
          'absolute top-0 bottom-0 left-0 right-0 flex flex-row items-center justify-center',
          !progress && 'hidden'
        )}
      >
        <span className="material-icons animate-spin text-gray-300">
          autorenew
        </span>
      </div>
    </button>
  );
}
