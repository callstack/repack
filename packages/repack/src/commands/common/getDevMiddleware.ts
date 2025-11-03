import url from 'node:url';

export async function getDevMiddleware(reactNativePath: string) {
  const reactNativeCommunityCliPluginPath = require.resolve(
    '@react-native/community-cli-plugin',
    { paths: [reactNativePath] }
  );

  const devMiddlewarePath = require.resolve('@react-native/dev-middleware', {
    paths: [reactNativeCommunityCliPluginPath],
  });

  // use fileURL to import correctly on both Windows & MacOS
  const { href: fileUrl } = url.pathToFileURL(devMiddlewarePath);
  return await import(fileUrl);
}
