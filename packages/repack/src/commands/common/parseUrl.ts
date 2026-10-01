// `new URL()` percent-encodes characters such as spaces, non-ASCII letters
// and the caret in `[projectRoot^N]`, but callers look the path up as a file.
function decodePathname(pathname: string) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    // a malformed escape sequence, e.g. a literal `%` in a file name
    return pathname;
  }
}

export function parseUrl(url: string, platforms: string[], base = 'file:///') {
  const { pathname: encodedPathname, searchParams } = new URL(url, base);
  const pathname = decodePathname(encodedPathname);

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
