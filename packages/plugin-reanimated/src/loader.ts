import { transform } from '@babel/core';
import type { LoaderContext } from '@rspack/core';

interface ReanimatedLoaderOptions {
  babelPlugins?: string[];
}

interface ReanimatedLoaderData {
  skip?: boolean;
}

// Reference: https://github.com/software-mansion/react-native-reanimated/blob/3.16.3/packages/react-native-reanimated/plugin/src/autoworkletization.ts#L19-L59
const REANIMATED_AUTOWORKLETIZATION_KEYWORDS = [
  'worklet',
  'useAnimatedGestureHandler',
  'useAnimatedScrollHandler',
  'useFrameCallback',
  'useAnimatedStyle',
  'useAnimatedProps',
  'createAnimatedPropAdapter',
  'useDerivedValue',
  'useAnimatedReaction',
  'useWorkletCallback',
  'withTiming',
  'withSpring',
  'withDecay',
  'withRepeat',
  'runOnUI',
  'executeOnUIRuntimeSync',
];

const REANIMATED_REGEX = new RegExp(
  REANIMATED_AUTOWORKLETIZATION_KEYWORDS.join('|')
);

export const raw = false;

export default function reanimatedLoader(
  this: LoaderContext<ReanimatedLoaderOptions>,
  source: string
) {
  this.cacheable();
  const callback = this.async();
  const options = this.getOptions();

  const loaderData = this.data as ReanimatedLoaderData;
  if (loaderData.skip || !REANIMATED_REGEX.test(source)) {
    callback(null, source);
    return;
  }

  const babelPlugins = options.babelPlugins ?? [];

  transform(
    source,
    {
      filename: this.resourcePath,
      babelrc: false,
      configFile: false,
      compact: false,
      comments: true,
      plugins: babelPlugins,
    },
    (err, result) => {
      if (err) {
        callback(err);
        return;
      }

      // @ts-ignore
      callback(null, result.code, result.map);
      return;
    }
  );
}

// resolve the path to the babel-swc-loader once
const babelSwcLoader = require.resolve('@callstack/repack/babel-swc-loader');
let warningDisplayed = false;

export function pitch(
  this: LoaderContext<ReanimatedLoaderOptions>,
  _remainingRequest: string,
  _previousRequest: string,
  data: ReanimatedLoaderData
) {
  const logger = this.getLogger('RepackReanimatedLoader');
  for (const loader of this.loaders) {
    // if the babel-swc-loader is found, we skip the reanimated-loader
    // since babel-swc-loader is more performant and uses the official
    // babel plugin directly
    if (loader.path === babelSwcLoader) {
      data.skip = true;
      if (!warningDisplayed) {
        warningDisplayed = true;
        logger.warn(
          'When using `@callstack/repack-plugin-reanimated` together with ' +
            '`@callstack/repack/babel-swc-loader` you should turn off the ' +
            'transforms for `react-native-reanimated` via the ' +
            '`unstable_disableTransform` option. Instead, please add the ' +
            '`react-native-reanimated/plugin` (or ' +
            '`react-native-worklets/plugin`) directly to your list of babel ' +
            'plugins in the `babel.config.js` file in the project root.'
        );
      }
    }
  }
}
