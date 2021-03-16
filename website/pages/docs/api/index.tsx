import Head from 'next/head';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { GetStaticProps } from 'next';
import { ReflectionKind } from 'typedoc';
import { Card, Keyword, Layout, Link } from '../../../components';
import { API_PROJECT_REFLECTION } from '../../../data';

export const getStaticProps: GetStaticProps = async () => {
  const classes = API_PROJECT_REFLECTION.groups
    .find((group) => group.kind === ReflectionKind.Class)
    .children.map(
      (childId) =>
        API_PROJECT_REFLECTION.children.find((child) => child.id === childId)
          .name
    );

  const functions = API_PROJECT_REFLECTION.groups
    .find((group) => group.kind === ReflectionKind.Function)
    .children.map(
      (childId) =>
        API_PROJECT_REFLECTION.children.find((child) => child.id === childId)
          .name
    );

  const interfaces = API_PROJECT_REFLECTION.groups
    .find((group) => group.kind === ReflectionKind.Interface)
    .children.map(
      (childId) =>
        API_PROJECT_REFLECTION.children.find((child) => child.id === childId)
          .name
    );

  const types = API_PROJECT_REFLECTION.groups
    .find((group) => group.kind === ReflectionKind.TypeAlias)
    .children.map(
      (childId) =>
        API_PROJECT_REFLECTION.children.find((child) => child.id === childId)
          .name
    );

  return {
    props: {
      classes,
      functions,
      interfaces,
      types,
    },
  };
};

export default function ApiDocs({
  classes,
  functions,
  interfaces,
  types,
}: {
  classes: string[];
  functions: string[];
  interfaces: string[];
  types: string[];
}) {
  return (
    <Layout>
      <Head>
        <title>API docs | react-native-webpack-toolkit</title>
      </Head>
      <h1 className="text-4xl font-bold text-auxiliary-300">
        API documentation
      </h1>
      <div className="flex justify-between mt-6 font-mono tracking-wider text-lg">
        <Card
          label={
            <Keyword as="h2" kind="class" className="text-2xl">
              classes
            </Keyword>
          }
          className="w-1/2 mr-2"
        >
          {classes.map((className) => (
            <Link key={className} href={`/docs/api/${className.toLowerCase()}`}>
              {className}
              <FontAwesomeIcon
                className="h-4 w-4 ml-2"
                icon={faExternalLinkAlt}
              />
            </Link>
          ))}
        </Card>
        <Card
          label={
            <Keyword as="h2" kind="function" className="text-2xl">
              functions
            </Keyword>
          }
          className="w-1/2 ml-2"
        >
          {functions.map((functionName) => (
            <Link
              key={functionName}
              href={`/docs/api/${functionName.toLowerCase()}`}
            >
              {functionName}
              <FontAwesomeIcon
                className="h-4 w-4 ml-2"
                icon={faExternalLinkAlt}
              />
            </Link>
          ))}
        </Card>
      </div>
      <div className="flex justify-between mt-4 font-mono tracking-wider text-lg">
        <Card
          label={
            <Keyword as="h2" kind="interface" className="text-2xl">
              interfaces
            </Keyword>
          }
          className="w-1/2 mr-2"
        >
          {interfaces.map((interfaceName) => (
            <Link
              key={interfaceName}
              href={`/docs/api/${interfaceName.toLowerCase()}`}
            >
              {interfaceName}
              <FontAwesomeIcon
                className="h-4 w-4 ml-2"
                icon={faExternalLinkAlt}
              />
            </Link>
          ))}
        </Card>
        <Card
          label={
            <Keyword as="h2" kind="type" className="text-2xl">
              types
            </Keyword>
          }
          className="w-1/2 ml-2"
        >
          {types.map((typeName) => (
            <Link key={typeName} href={`/docs/api/${typeName.toLowerCase()}`}>
              {typeName}
              <FontAwesomeIcon
                className="h-4 w-4 ml-2"
                icon={faExternalLinkAlt}
              />
            </Link>
          ))}
        </Card>
      </div>
    </Layout>
  );
}
