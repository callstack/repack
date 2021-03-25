import fs from 'fs';
import path from 'path';
import Head from 'next/head';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { GetStaticProps } from 'next';
import { Layout, Markdown } from '../../../components';
import markdownToHtml from '../../../lib/markdownToHtml';

export const getStaticProps: GetStaticProps = async () => {
  const mdSource = fs.readFileSync(
    path.join(process.cwd(), 'data/generated/modules.md'),
    'utf-8'
  );

  const html = await markdownToHtml(mdSource);

  return {
    props: {
      md: html
        .replace(/<h1>react-native-webpack-toolkit<\/h1>/, '')
        .replace(/<h3>/, '<h2>')
        .replace(/<\/h3>/, '</h2>')
        .replace(/<h2>/, '<h1>')
        .replace(/<\/h2>/, '</h1>'),
    },
  };
};

export default function ApiDocs({ md }: { md: string }) {
  return (
    <Layout>
      <Head>
        <title>API docs | react-native-webpack-toolkit</title>
      </Head>
      <Markdown source={md} />
    </Layout>
  );
}
