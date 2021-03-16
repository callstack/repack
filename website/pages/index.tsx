import Head from 'next/head';
import { GetStaticProps } from 'next';
import { Layout } from '../components/Layout';
import { README_SOURCE } from '../data';
import markdownToHtml from '../lib/markdownToHtml';
import { Markdown } from '../components';

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {
      readme: await markdownToHtml(README_SOURCE),
    },
  };
};

export default function Home({ readme }: { readme: string }) {
  return (
    <Layout>
      <Head>
        <title>react-native-webpack-toolkit</title>
      </Head>
      <Markdown source={readme} />
    </Layout>
  );
}
