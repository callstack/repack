type LoaderOptions = Record<string, unknown>;

function isNodeModule(resourcePath: string): boolean {
  return resourcePath.replaceAll('\\', '/').includes('/node_modules/');
}

function mergeResourceCaller(
  caller: unknown,
  resourcePath: string
): LoaderOptions {
  return {
    ...(typeof caller === 'object' && caller !== null ? caller : {}),
    isNodeModule: isNodeModule(resourcePath),
  };
}

export function withExpoBabelCaller(
  options: LoaderOptions,
  resourcePath: string
): LoaderOptions {
  return {
    ...options,
    caller: mergeResourceCaller(options.caller, resourcePath),
  };
}
