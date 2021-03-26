import fs from 'fs';
import path from 'path';
import Head from 'next/head';
import globby from 'globby';
import { GetStaticProps, GetStaticPaths } from 'next';
import { Layout, Markdown, Link } from '../../../../components';
import markdownToHtml from '../../../../lib/markdownToHtml';

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = (
    await globby(
      ['classes/*', 'functions/*', 'interfaces/*', 'types/*', 'variables/*'],
      {
        cwd: path.join(process.cwd(), 'data/generated'),
      }
    )
  ).map((url) => `/docs/api/${url}`);

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params: { type, id },
}: {
  params: { type: string; id: string };
}) => {
  const mdSource = fs.readFileSync(
    path.join(process.cwd(), 'data/generated', type.toString(), id.toString()),
    'utf-8'
  );

  const html = await markdownToHtml(mdSource);

  return {
    props: {
      title: mdSource.match(/<div data-title="(.*)"><\/div>/)[1],
      md: html,
    },
  };
};

export default function ReflectionPage({
  title,
  md,
}: {
  title: string;
  md: string;
}) {
  return (
    <Layout>
      <Head>
        <title>{title} | API docs | react-native-webpack-toolkit</title>
      </Head>
      <Link href="/docs/api" className="ml-8" bold>
        <span className="material-icons mt-0.5">arrow_back</span>
        <span className="hover:underline">Back to listing</span>
      </Link>
      <Markdown toc="floating" source={md} />
    </Layout>
  );
}
