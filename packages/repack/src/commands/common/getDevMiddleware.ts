import url from 'node:url';

export async function getDevMiddleware(reactNativePath: string) {
  const reactNativeCommunityCliPluginPath = require.resolve(
    '@react-native/community-cli-plugin',
    { paths: [reactNativePath] }
  );

  const devMiddlewarePath = require.resolve('@react-native/dev-middleware', {
    paths: [reactNativeCommunityCliPluginPath],
  });

  const { href: fileUrl } = url.pathToFileURL(devMiddlewarePath);
  return await import(fileUrl);
}
