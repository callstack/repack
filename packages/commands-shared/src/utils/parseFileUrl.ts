export function parseFileUrl(fileUrl: string, base?: string) {
  const url = new URL(fileUrl, base);
  const { pathname, searchParams } = url;

  let platform = searchParams.get('platform');
  let filename = pathname;

  if (!platform) {
    const pathArray = pathname.split('/');
    const platformFromPath = pathArray[1];

    if (platformFromPath === 'ios' || platformFromPath === 'android') {
      platform = platformFromPath;
      filename = pathArray.slice(2).join('/');
    }
  }

  if (!platform) {
    const [, platformOrName, name] = filename.split('.').reverse();
    if (name !== undefined) {
      platform = platformOrName;
    }
  }

  return {
    filename: filename.replace(/^\//, ''),
    platform: platform || undefined,
  };
}
