import fs from 'node:fs';
import execa from 'execa';

interface TransformBundleToHermesBytecodeOptions {
  /** Path to the Hermes compiler binary. */
  hermesCLIPath: string;

  /** Whether to generate source maps. */
  useSourceMaps: boolean;

  /** Path to the bundle to be transformed. */
  bundlePath: string;
}

/**
 * Transforms a bundle to Hermes bytecode.
 *
 * Logic based on implementations for each platform.
 * - iOS: [react-native-xcode.sh](https://github.com/facebook/react-native/blob/f38fc9ba8681622f7cfdb586753e50c596946929/packages/react-native/scripts/react-native-xcode.sh#L166-L187)
 * - Android: [BundleHermesCTask.kt](https://github.com/facebook/react-native/blob/f38fc9ba8681622f7cfdb586753e50c596946929/packages/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/tasks/BundleHermesCTask.kt#L93-L111) (with defaults in [ReactExtension.kt](https://github.com/facebook/react-native/blob/f38fc9ba8681622f7cfdb586753e50c596946929/packages/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/ReactExtension.kt#L116-L117))
 */
export const transformBundleToHermesBytecode = async ({
  hermesCLIPath,
  useSourceMaps,
  bundlePath,
}: TransformBundleToHermesBytecodeOptions) => {
  const hermesBundlePath = bundlePath + '.hbc';
  const hermesSourceMapPath = bundlePath + '.hbc.map';

  try {
    // Transform bundle to bytecode
    await execa(
      hermesCLIPath,
      [
        '-w', // Silence warnings else buffer overflows
        '-O', // Enable optimizations
        '-emit-binary',
        '-out',
        hermesBundlePath,
        useSourceMaps ? '-output-source-map' : '',
        bundlePath,
      ].filter(Boolean)
    );

    await fs.promises.unlink(bundlePath);
    await fs.promises.rename(hermesBundlePath, bundlePath);

    return { sourceMap: hermesSourceMapPath };
  } catch (error) {
    const message = (error as Error).toString();
    throw new Error(
      `[RepackHermesBytecodePlugin] Failed to transform bundle ${bundlePath}. Reason:\n${message})`
    );
  }
};
