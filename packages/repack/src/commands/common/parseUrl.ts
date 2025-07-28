export function parseUrl(url: string, platforms: string[], base = 'file:///') {
  const { pathname, searchParams } = new URL(url, base);

  let path = pathname;
  let platform = searchParams.get('platform');

  if (!platform) {
    const pathArray = pathname.split('/');
    const platformFromPath = pathArray[1];

    if (platforms.includes(platformFromPath)) {
      platform = platformFromPath;
      path = pathArray.slice(2).join('/');
    }
  }

  if (!platform) {
    const [, platformOrName, name] = path.split('.').reverse();
    if (name !== undefined && platforms.includes(platformOrName)) {
      platform = platformOrName;
    }
  }

  return {
    resourcePath: path.replace(/^\//, ''),
    platform: platform || undefined,
  };
}
