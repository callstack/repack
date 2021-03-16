import Head from 'next/head';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLongArrowAltLeft } from '@fortawesome/free-solid-svg-icons';
import { GetStaticPaths, GetStaticProps } from 'next';
import { JSONOutput, ReflectionKind } from 'typedoc';
import { Keyword, Layout, Link } from '../../../components';
import { API_PROJECT_REFLECTION } from '../../../data';

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = API_PROJECT_REFLECTION.children
    .filter((child) =>
      [
        ReflectionKind.Class,
        ReflectionKind.Function,
        ReflectionKind.Interface,
        ReflectionKind.TypeAlias,
        ReflectionKind.Enum,
      ].includes(child.kind)
    )
    .map((child) => `/docs/api/${child.name.toLowerCase()}`);

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const id = params.id as string;
  const reflection = API_PROJECT_REFLECTION.children.find(
    (child) => child.name.toLowerCase() === id
  );
  const kind = {
    [ReflectionKind.Class]: 'class',
    [ReflectionKind.Function]: 'function',
    [ReflectionKind.Interface]: 'interface',
    [ReflectionKind.TypeAlias]: 'type',
    [ReflectionKind.Enum]: 'enum',
  }[reflection.kind];

  return {
    props: {
      kind,
      reflection,
      projectReflection: API_PROJECT_REFLECTION,
    },
  };
};

export default function ApiItemDocs({
  kind,
  reflection,
  projectReflection,
}: {
  kind: string;
  reflection: JSONOutput.DeclarationReflection;
  projectReflection: JSONOutput.ProjectReflection;
}) {
  return (
    <Layout>
      <Head>
        <title>API docs | react-native-webpack-toolkit</title>
      </Head>
      <Link href="/docs/api">
        <FontAwesomeIcon className="h-4 w-4 mr-2" icon={faLongArrowAltLeft} />
        Back to listing
      </Link>
      <h1 className="text-4xl font-bold text-auxiliary-30 mt-4">
        <Keyword kind={kind as any} className="mr-2">
          {kind}
        </Keyword>
        {reflection.name}
      </h1>
      {/* <div className="flex justify-between mt-6">
        <Card
          label={
            <Keyword as="h2" kind="class" className="text-2xl">
              classes
            </Keyword>
          }
          className="w-1/2 mr-2"
        >
          <div className="font-mono tracking-wider text-lg">
            <Link href="/">
              DevServer
              <FontAwesomeIcon
                className="h-4 w-4 ml-2"
                icon={faExternalLinkAlt}
              />
            </Link>
          </div>
        </Card>
        <Card
          label={
            <Keyword as="h2" kind="function" className="text-2xl">
              functions
            </Keyword>
          }
          className="w-1/2 ml-2"
        >
          Card 2
        </Card>
      </div>
      <div className="flex justify-between mt-4">
        <Card
          label={
            <Keyword as="h2" kind="interface" className="text-2xl">
              interfaces
            </Keyword>
          }
          className="w-1/2 mr-2"
        >
          Card 2
        </Card>
        <Card
          label={
            <Keyword as="h2" kind="type" className="text-2xl">
              types
            </Keyword>
          }
          className="w-1/2 ml-2"
        >
          Card 2
        </Card>
      </div> */}
    </Layout>
  );
}
