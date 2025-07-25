import { transform } from '@babel/core';
import type { LoaderContext } from '@rspack/core';

interface ReanimatedLoaderOptions {
  babelPlugins?: string[];
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

  if (!REANIMATED_REGEX.test(source)) {
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
