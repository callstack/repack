import Head from 'next/head';
// import { GetStaticProps } from 'next';
import { Layout } from '../components/Layout';

// export const getStaticProps: GetStaticProps = async () => {
//   return {
//     props: {
//     },
//   };
// };

export default function Home() {
  return (
    <Layout>
      <Head>
        <title>react-native-webpack-toolkit</title>
      </Head>
    </Layout>
  );
}
