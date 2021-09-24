import * as React from 'react';
import cx from 'classnames';
import { Button } from '../../components/Button';

interface Props {
  label: string;
  position: 'top' | 'bottom';
  onClear: () => void;
  onScroll: () => void;
}

export function ActionsBar({ label, onClear, onScroll, position }: Props) {
  return (
    <div
      className={cx(
        'flex flex-row justify-between my-2',
        position === 'top' ? 'items-end' : 'items-start'
      )}
    >
      <span className="mr-4 italic text-sm text-gray-400">{label}</span>
      <div className="flex flex-row">
        <Button onClick={onClear} className="mr-1">
          <span className="material-icons mr-2 text-xl">delete</span>
          Clear logs
        </Button>
        <Button onClick={onScroll}>
          <span className="material-icons mr-2 text-xl">
            {position === 'top' ? 'south' : 'north'}
          </span>
          Scroll to {position === 'top' ? 'bottom' : 'top'}
        </Button>
      </div>
    </div>
  );
}
