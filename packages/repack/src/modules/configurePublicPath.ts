import { getDevServerLocation } from './getDevServerLocation.ts';

// We need to teak Webpack's public path, especially for Android, where `localhost`
// is not a correct host but eg `10.0.2.2` is.
// If the public path doesn't have `localhost` in it, it usually means a custom `host` was
// provided, so the replace won't change that.
const { hostname } = getDevServerLocation();
__webpack_public_path__ = __webpack_public_path__.replace(
  'localhost',
  hostname
);
