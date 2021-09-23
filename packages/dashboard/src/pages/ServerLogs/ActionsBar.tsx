import * as React from 'react';
import { Button } from '../../components/Button';

interface Props {
  label: string;
  position: 'top' | 'bottom';
  onClear: () => void;
  onScroll: () => void;
}

export function ActionsBar({ label, onClear, onScroll, position }: Props) {
  return (
    <div className="flex flex-row justify-end items-center my-2">
      <span className="mr-4 italic">{label}</span>
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
  );
}
