import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckSquare } from '@fortawesome/free-solid-svg-icons';
import { faSquare } from '@fortawesome/free-regular-svg-icons';
import ReactDOMServer from 'react-dom/server';
import MarkdownStyles from './Markdown.module.css';

// TODO: move it somewhere
const REPO_URL =
  'https://github.com/callstack/react-native-webpack-toolkit/blob/main/';

function serializeId(value: string) {
  return value.replace(/&#.+;/g, '').replace(/\s/g, '-').toLowerCase();
}

export function Markdown({ source }: { source: string }) {
  const iconSquare = ReactDOMServer.renderToString(
    <FontAwesomeIcon icon={faSquare} />
  );
  const iconCheckSquare = ReactDOMServer.renderToString(
    <FontAwesomeIcon icon={faCheckSquare} />
  );

  console.log(source);

  const processedSource = source
    .replace(/<li>\[x\]/g, `<li>${iconCheckSquare}`)
    .replace(/<li>\[ \]/g, `<li>${iconSquare}`)
    .replace(/a href="\.\//g, `a href="${REPO_URL}`)
    .replace(
      /(h\d)>(.+)</g,
      (_, heading, value) => `${heading} id="${serializeId(value)}">${value}<`
    );

  return (
    <div
      className={MarkdownStyles['markdown']}
      dangerouslySetInnerHTML={{ __html: processedSource }}
    />
  );
}
