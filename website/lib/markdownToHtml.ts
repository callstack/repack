import { URL } from 'url';
import remark from 'remark';
import html from 'remark-html';
import gfm from 'remark-gfm';
import remark2rehype from 'remark-rehype';
import stringify from 'rehype-stringify';
import raw from 'rehype-raw';
import autolink from 'rehype-autolink-headings';
import slug from 'rehype-slug';
import urls from 'rehype-urls';
import highlight from 'remark-highlight.js';

export default async function markdownToHtml(markdown: string) {
  const result = await remark()
    .use(gfm)
    .use(highlight)
    .use(html)
    .use(remark2rehype, { allowDangerousHtml: true })
    // @ts-ignore
    .use(urls, (url: Location, node: { properties: Record<string, any> }) => {
      const location = new URL(url.href, 'http://localhost');
      if (location.host === 'github.com') {
        node.properties.target = '_blank';
      } else {
        if (location.hostname === 'localhost') {
          return `${location.pathname}${location.hash}`;
        }
      }
    })
    .use(slug)
    .use(autolink, { behavior: 'append' })
    .use(raw)
    .use(stringify)
    .process(markdown);
  return result.toString();
}
