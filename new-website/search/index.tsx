import type { OnSearch } from 'rspress/theme';

const VERSION_SEGMENT_REGEX = /^\d+\.\w+/;

function getVersionFromUrl() {
  const pathname = window.location.pathname;
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length > 0) {
    const firstSegment = segments[0];
    if (firstSegment.match(VERSION_SEGMENT_REGEX)) {
      return firstSegment;
    }
  }
  return 'default';
}

function removeLeadingSlash(path: string) {
  return path.replace(/^\//, '');
}

/* Limit search results to current version only */
const onSearch: OnSearch = async (_, defaultSearchResult) => {
  const currentVersion = getVersionFromUrl();

  const { group, renderType, result } = defaultSearchResult[0];
  defaultSearchResult.pop();

  const results = result.filter((item) => {
    const link = removeLeadingSlash(item.link);
    if (currentVersion !== 'default') {
      return link.startsWith(currentVersion);
    } else {
      return !link.match(VERSION_SEGMENT_REGEX);
    }
  });

  return [{ group, renderType, result: results }];
};

export { onSearch };
