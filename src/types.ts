import webpack from 'webpack';

export type WebpackLogger = ReturnType<
  webpack.Compiler['getInfrastructureLogger']
>;

export interface WebpackPlugin {
  apply(compiler: webpack.Compiler): void;
}

export interface Arguments {
  assetsDest?: string;
  entryFile: string;
  resetCache: boolean;
  resetGlobalCache: boolean;
  transformer?: string;
  minify?: boolean;
  config?: string;
  platform: string;
  dev: boolean;
  bundleOutput: string;
  bundleEncoding?: string;
  maxWorkers?: number;
  sourcemapOutput?: string;
  sourcemapSourcesRoot?: string;
  sourcemapUseAbsolutePath: boolean;
  verbose: boolean;
  unstableTransformProfile?: string;
}

export interface CliOptions {
  config: {
    root: string;
    reactNativePath: string;
    webpackConfigPath: string;
  };
  arguments: Arguments;
}

export interface WebpackOptions {
  mode: 'production' | 'development';
  dev: boolean;
  platform: string;
  context: string;
  entry: string;
  outputPath: string;
  outputFilename: string;
  sourcemapFilename?: string;
  assetsOutputPath?: string;
  minimize: boolean;
  reactNativePath: string;
}
