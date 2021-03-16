import NextLink, { LinkProps } from 'next/link';
import React from 'react';
import cx from 'classnames';

export function Link({
  external,
  children,
  className,
  href,
  bold,
  ...linkProps
}: LinkProps & {
  children: React.ReactNode;
  external?: boolean;
  className?: string;
  bold?: boolean;
}) {
  const finalClassName = cx(
    'transition ease-in duration-200 flex items-center hover:text-primary-200 cursor-pointer',
    bold && 'font-bold',
    className
  );

  return external ? (
    <a href={href.toString()} className={finalClassName}>
      {children}
    </a>
  ) : (
    <NextLink href={href} {...linkProps}>
      <a className={finalClassName}>{children}</a>
    </NextLink>
  );
}
