import type {
  ResolverOptions,
  ScriptLocator,
  ScriptLocatorResolver,
} from '@callstack/repack/client';

export const LOCAL_CHUNK_RESOLVER_KEY = '@callstack/repack-expo/local-chunks';
const LOCAL_CHUNK_RESOLVER_PRIORITY = 1;

type ScriptApi = {
  getDevServerURL(scriptId: string): ScriptLocator['url'];
  getFileSystemURL(scriptId: string): ScriptLocator['url'];
};

type ScriptManagerApi = {
  addResolver(resolver: ScriptLocatorResolver, options?: ResolverOptions): void;
};

type LocalChunkResolverOptions = {
  isDev: boolean;
  script: ScriptApi;
};

export function createLocalChunkResolver({
  isDev,
  script,
}: LocalChunkResolverOptions): ScriptLocatorResolver {
  return async (scriptId) => ({
    cache: false,
    url: isDev
      ? script.getDevServerURL(scriptId)
      : script.getFileSystemURL(scriptId),
  });
}

export function registerLocalChunkResolver({
  isDev,
  script,
  scriptManager,
}: LocalChunkResolverOptions & { scriptManager: ScriptManagerApi }): void {
  scriptManager.addResolver(createLocalChunkResolver({ isDev, script }), {
    key: LOCAL_CHUNK_RESOLVER_KEY,
    priority: LOCAL_CHUNK_RESOLVER_PRIORITY,
  });
}
