export interface BabelSwcLoaderOptions {
  lazyImports?: boolean | string[];
  projectRoot: string;
}

export function validateOptions(options: BabelSwcLoaderOptions) {
  if (!options.projectRoot || typeof options.projectRoot !== 'string') {
    throw new Error(
      'Option `projectRoot` is required and must be of type string'
    );
  }

  if (options.lazyImports) {
    if (
      typeof options.lazyImports !== 'boolean' &&
      !Array.isArray(options.lazyImports)
    ) {
      throw new Error(
        'Option `lazyImports` must be of type boolean or an array of strings'
      );
    }
  }
}
