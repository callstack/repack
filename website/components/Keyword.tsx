import React from 'react';
import cx from 'classnames';

export function Keyword({
  as = 'span',
  children,
  bold,
  italic,
  kind,
  className,
}: {
  as?: 'span' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  children: React.ReactNode;
  bold?: boolean;
  italic?: boolean;
  kind?: 'class' | 'interface' | 'function' | 'type' | 'enum';
  className?: string;
}) {
  return React.createElement(
    as,
    {
      className: cx(
        'font-mono',
        {
          'font-bold': bold,
          italic: italic,
        },
        kind &&
          {
            class: 'text-class',
            interface: 'text-interface',
            function: 'text-function',
            type: 'text-type',
            enum: 'text-enum',
          }[kind],
        className
      ),
    },
    children
  );
}
