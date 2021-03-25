import React from 'react';
import cx from 'classnames';
import MarkdownStyles from './Markdown.module.css';

export function Markdown({
  source,
  toc,
}: {
  source: string;
  toc?: 'floating';
}) {
  return (
    <div
      className={cx(
        MarkdownStyles['markdown'],
        toc === 'floating' ? MarkdownStyles['floatingToc'] : undefined
      )}
      dangerouslySetInnerHTML={{ __html: source }}
    />
  );
}
