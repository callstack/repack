import webpack from 'webpack';

export type WebpackLogger = ReturnType<
  webpack.Compiler['getInfrastructureLogger']
>;

export interface WebpackPlugin {
  apply(compiler: webpack.Compiler): void;
}

export interface CommonArguments {
  platform: string;
  resetCache?: boolean;
}

export interface BundleArguments extends CommonArguments {
  assetsDest?: string;
  entryFile: string;
  minify?: boolean;
  dev: boolean;
  bundleOutput: string;
  // bundleEncoding?: string;
  sourcemapOutput?: string;
  // sourcemapSourcesRoot?: string;
  // sourcemapUseAbsolutePath: boolean;
}

export interface StartArguments extends CommonArguments {
  cert?: string;
  host?: string;
  https?: boolean;
  key?: string;
  port?: number;
  // projectRoot?: string; ??
}

export interface DevServerOptions {
  host?: string;
  port: number;
  https?: boolean;
  cert?: string;
  key?: string;
}

export interface CliOptions {
  config: {
    root: string;
    reactNativePath: string;
    webpackConfigPath: string;
  };
  command: 'bundle' | 'start';
  arguments:
    | {
        bundle: BundleArguments;
      }
    | {
        start: StartArguments;
      };
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
  devServer?: DevServerOptions;
}

export type LogType = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  type: LogType;
  issuer: string;
  message: any[];
}
